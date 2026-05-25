import * as XLSX from 'xlsx';
import { supabase } from './supabase';

type ImportedStudent = { no?: number; student_name: string; gender?: string; date_of_birth?: string; id_card_number?: string; address?: string; real_status?: string; id_card_result?: string; voter_result?: string; final_registration_date?: string };

const aliases: Record<string, string[]> = {
  no: ['no','ល.រ','លរ','លេខរៀង','លំដាប់'],
  student_name: ['student name','name','ឈ្មោះ','គោត្តនាមនិងនាម','នាមត្រកូល និងនាមខ្លួន','សិស្ស'],
  gender: ['gender','ភេទ'],
  date_of_birth: ['date of birth','dob','ថ្ងៃខែឆ្នាំកំណើត','ថ្ងៃកំណើត'],
  id_card_number: ['id card number','អត្តសញ្ញាណប័ណ្ណ','លេខអត្តសញ្ញាណប័ណ្ណ','លេខអ.ខ'],
  address: ['address','អាសយដ្ឋាន','ទីលំនៅ'],
  real_status: ['status','ស្ថានភាព','real_status'],
  id_card_result: ['result','លទ្ធផល','id_card_result'],
  voter_result: ['voter_result','លទ្ធផលចុះឈ្មោះ'],
  final_registration_date: ['final registration date','ថ្ងៃចុងក្រោយ','កាលបរិច្ឆេទចុងក្រោយ']
};
const norm = (v:any) => String(v ?? '').trim().toLowerCase().replace(/\s+/g,' ');
function excelDate(v:any){
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` : undefined; }
  const dt = new Date(v); return Number.isNaN(dt.getTime()) ? String(v) : dt.toISOString().slice(0,10);
}
function mapHeader(header:string){
  const h = norm(header);
  return Object.entries(aliases).find(([, arr]) => arr.some(a => h.includes(norm(a))))?.[0];
}
export async function importStudentsFromExcel(file: File, classId: string) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:'array', cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows:any[][] = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
  const headerIndex = rows.findIndex(r => r.some(c => mapHeader(c)));
  if (headerIndex < 0) throw new Error('រកមិនឃើញជួរចំណងជើងក្នុង Excel');
  const headers = rows[headerIndex];
  const mapped = headers.map(mapHeader);
  const students: ImportedStudent[] = rows.slice(headerIndex+1).map(r => {
    const s:any = { class_id: classId };
    mapped.forEach((key, i) => { if (!key) return; s[key] = r[i]; });
    return {
      no: Number(s.no) || undefined,
      student_name: String(s.student_name || '').trim(),
      gender: s.gender === 'ស្រី' ? 'ស្រី' : s.gender === 'ប្រុស' ? 'ប្រុស' : undefined,
      date_of_birth: excelDate(s.date_of_birth),
      id_card_number: s.id_card_number ? String(s.id_card_number) : undefined,
      address: s.address ? String(s.address) : undefined,
      real_status: s.real_status ? String(s.real_status) : undefined,
      id_card_result: s.id_card_result ? String(s.id_card_result) : undefined,
      voter_result: s.voter_result ? String(s.voter_result) : undefined,
      final_registration_date: excelDate(s.final_registration_date)
    };
  }).filter(s => s.student_name);
  const payload = students.map(s => ({ ...s, class_id: classId }));
  const { error } = await supabase.from('students').upsert(payload, { onConflict:'class_id,student_name' });
  if (error) throw error;
  return payload.length;
}
