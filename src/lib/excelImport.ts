import * as XLSX from 'xlsx';
import { supabase } from './supabase';

type ImportedStudent = {
  student_code?: string;
  name: string;
  gender?: string;
  dob?: string;
  classroom?: string;
  id_card_number?: string;
  phone?: string;
  address?: string;
  province_name?: string;
  district_name?: string;
  commune_name?: string;
  village_name?: string;
  real_status?: string;
  id_card_result?: string;
  voter_result?: string;
  final_registration_date?: string;
};

const aliases: Record<keyof ImportedStudent, string[]> = {
  student_code:            ['student code', 'លេខកូដ', 'លេខកូដសិស្ស', 'studentcode'],
  name:                    ['name', 'student name', 'ឈ្មោះ', 'គោត្តនាមនិងនាម', 'នាមត្រកូលនិងនាមខ្លួន', 'សិស្ស'],
  gender:                  ['gender', 'sex', 'ភេទ'],
  dob:                     ['dob', 'date of birth', 'ថ្ងៃខែឆ្នាំកំណើត', 'ថ្ងៃកំណើត'],
  classroom:               ['classroom', 'class', 'ថ្នាក់', 'ថ្នាក់រៀន'],
  id_card_number:          ['id card number', 'idcard', 'អត្តសញ្ញាណប័ណ្ណ', 'លេខអត្តសញ្ញាណប័ណ្ណ', 'លេខអ.ខ'],
  phone:                   ['phone', 'tel', 'លេខទូរស័ព្ទ', 'ទូរស័ព្ទ'],
  address:                 ['address', 'អាសយដ្ឋាន', 'ផ្ទះលេខ', 'ទីលំនៅ'],
  province_name:           ['province', 'ខេត្ត', 'រាជធានី', 'ខេត្តរាជធានី'],
  district_name:           ['district', 'ស្រុក', 'ខណ្ឌ', 'ស្រុកខណ្ឌ'],
  commune_name:            ['commune', 'ឃុំ', 'សង្កាត់', 'ឃុំសង្កាត់'],
  village_name:            ['village', 'ភូមិ'],
  real_status:             ['status', 'ស្ថានភាព', 'real_status'],
  id_card_result:          ['result', 'លទ្ធផល', 'id_card_result', 'លទ្ធផលអត្តសញ្ញាណប័ណ្ណ'],
  voter_result:            ['voter_result', 'លទ្ធផលចុះឈ្មោះ', 'ការចុះឈ្មោះ'],
  final_registration_date: ['final registration date', 'ថ្ងៃចុងក្រោយ', 'កាលបរិច្ឆេទចុងក្រោយ', 'ថ្ងៃចុះឈ្មោះចុងក្រោយ']
};

const norm = (v: unknown): string =>
  String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.\-_/]/g, '');

function excelDate(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : undefined;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
}

function mapHeader(header: unknown): keyof ImportedStudent | undefined {
  const h = norm(header);
  if (!h) return undefined;
  for (const [key, arr] of Object.entries(aliases)) {
    if (arr.some(a => h.includes(norm(a)))) return key as keyof ImportedStudent;
  }
  return undefined;
}

type AddressMap = {
  provinces: Map<string, string>;
  districts: Map<string, string>;
  communes: Map<string, string>;
  villages: Map<string, string>;
};

/**
 * Build name → id maps for ONLY the address names that appear in the
 * imported rows. Avoids loading 14,372 villages on Supabase free tier.
 */
async function loadAddressMapsForNames(
  names: { p: Set<string>; d: Set<string>; c: Set<string>; v: Set<string> }
): Promise<AddressMap> {
  const lookup = async (table: string, set: Set<string>) => {
    const m = new Map<string, string>();
    if (set.size === 0) return m;
    const list = Array.from(set);
    const BATCH = 200;
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from(table)
        .select('id, name_km')
        .in('name_km', chunk);
      if (error) throw error;
      (data || []).forEach((r: any) => m.set(String(r.name_km).trim(), r.id));
    }
    return m;
  };
  const [provinces, districts, communes, villages] = await Promise.all([
    lookup('provinces', names.p),
    lookup('districts', names.d),
    lookup('communes',  names.c),
    lookup('villages',  names.v)
  ]);
  return { provinces, districts, communes, villages };
}

function genStudentCode(): string {
  return `R${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
}

export interface ImportResult {
  total: number;
  inserted: number;
  errors: string[];
}

export async function importStudentsFromExcel(file: File, classroom: string): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const headerIndex = rows.findIndex(r => r.some(c => mapHeader(c)));
  if (headerIndex < 0) throw new Error('រកមិនឃើញជួរចំណងជើងក្នុង Excel។ សូមធានាថាមានជួរ "ឈ្មោះ"');

  const headers = rows[headerIndex];
  const mapped = headers.map(mapHeader);
  const errors: string[] = [];

  const records = rows.slice(headerIndex + 1).map((r, idx) => {
    const o: Partial<ImportedStudent> = {};
    mapped.forEach((key, i) => { if (key) (o as any)[key] = r[i]; });
    return { line: headerIndex + idx + 2, raw: o };
  }).filter(x => String(x.raw.name ?? '').trim().length > 0);

  // Collect only the address names that actually appear, then look them up
  const names = { p: new Set<string>(), d: new Set<string>(), c: new Set<string>(), v: new Set<string>() };
  records.forEach(({ raw }) => {
    if (raw.province_name) names.p.add(String(raw.province_name).trim());
    if (raw.district_name) names.d.add(String(raw.district_name).trim());
    if (raw.commune_name)  names.c.add(String(raw.commune_name).trim());
    if (raw.village_name)  names.v.add(String(raw.village_name).trim());
  });
  const addr = await loadAddressMapsForNames(names);

  const payload = records.map(({ line, raw }) => {
    const g = String(raw.gender ?? '').trim();
    const gender = g === 'ស្រី' || /female|^f$/i.test(g) ? 'ស្រី'
      : g === 'ប្រុស' || /male|^m$/i.test(g) ? 'ប្រុស' : '';

    const province_id = raw.province_name ? addr.provinces.get(String(raw.province_name).trim()) || null : null;
    const district_id = raw.district_name ? addr.districts.get(String(raw.district_name).trim()) || null : null;
    const commune_id  = raw.commune_name  ? addr.communes.get(String(raw.commune_name).trim())  || null : null;
    const village_id  = raw.village_name  ? addr.villages.get(String(raw.village_name).trim())  || null : null;

    if (raw.province_name && !province_id) errors.push(`បន្ទាត់ ${line}: រកមិនឃើញខេត្ត "${raw.province_name}"`);
    if (raw.district_name && !district_id) errors.push(`បន្ទាត់ ${line}: រកមិនឃើញស្រុក "${raw.district_name}"`);

    return {
      student_code: raw.student_code ? String(raw.student_code).trim() : genStudentCode(),
      name: String(raw.name).trim(),
      gender,
      dob: excelDate(raw.dob) || null,
      classroom: raw.classroom ? String(raw.classroom).trim() : classroom,
      id_card_number: raw.id_card_number ? String(raw.id_card_number).trim() : null,
      phone: raw.phone ? String(raw.phone).trim() : null,
      address: raw.address ? String(raw.address).trim() : null,
      province_id,
      district_id,
      commune_id,
      village_id,
      real_status: raw.real_status ? String(raw.real_status).trim() : null,
      id_card_result: raw.id_card_result ? String(raw.id_card_result).trim() : undefined,
      voter_result: raw.voter_result ? String(raw.voter_result).trim() : undefined,
      final_registration_date: excelDate(raw.final_registration_date) || null,
      status: 'active'
    };
  });

  if (payload.length === 0) return { total: 0, inserted: 0, errors: ['Excel គ្មានទិន្នន័យសិស្ស'] };

  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error, count } = await supabase
      .from('students')
      .upsert(chunk, { onConflict: 'student_code', count: 'exact' });
    if (error) {
      errors.push(`Batch ${i / chunkSize + 1}: ${error.message}`);
    } else {
      inserted += count ?? chunk.length;
    }
  }

  return { total: payload.length, inserted, errors };
}
