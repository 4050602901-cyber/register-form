import * as XLSX from 'xlsx';
import { StudentRow, ModuleType } from '../types';
import { ageText } from './utils';

function colWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function buildSheet(title: string, students: StudentRow[], module: ModuleType): XLSX.WorkSheet {
  const headers = module === 'id_card'
    ? ['ល.រ', 'ថ្នាក់', 'ឈ្មោះសិស្ស', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'អាយុ', 'លេខអត្តសញ្ញាណប័ណ្ណ', 'ទូរស័ព្ទ', 'ភូមិ', 'ឃុំ/សង្កាត់', 'ស្រុក/ខណ្ឌ', 'ខេត្ត/រាជធានី', 'ផ្ទះលេខ/ផ្លូវ', 'ស្ថានភាព', 'លទ្ធផល']
    : ['ល.រ', 'ថ្នាក់', 'ឈ្មោះសិស្ស', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'អាយុ', 'លេខអត្តសញ្ញាណប័ណ្ណ', 'ទូរស័ព្ទ', 'ភូមិ', 'ឃុំ/សង្កាត់', 'ស្រុក/ខណ្ឌ', 'ខេត្ត/រាជធានី', 'ផ្ទះលេខ/ផ្លូវ', 'ថ្ងៃចុះឈ្មោះចុងក្រោយ', 'លទ្ធផលចុះឈ្មោះ'];

  const body = students.map((s, i) => {
    const common = [
      s.no ?? i + 1,
      s.classes?.name ?? '',
      s.student_name,
      s.gender ?? '',
      s.date_of_birth ?? '',
      ageText(s.date_of_birth),
      s.id_card_number ?? '',
      s.phone ?? '',
      s.villages?.name_km ?? '',
      s.communes?.name_km ?? '',
      s.districts?.name_km ?? '',
      s.provinces?.name_km ?? '',
      s.address ?? ''
    ];
    return module === 'id_card'
      ? [...common, s.real_status ?? '', s.id_card_result ?? '']
      : [...common, s.final_registration_date ?? '', s.voter_result ?? ''];
  });

  const total = students.length;
  const female = students.filter(s => s.gender === 'ស្រី').length;
  const completed = students.filter(s => (module === 'id_card' ? s.id_card_result : s.voter_result)?.includes('រួច')).length;
  const summary = `សរុប: ${total} | ស្រី: ${female} | រួច: ${completed} | មិនទាន់: ${total - completed}`;

  const data = [[title], [summary], [], headers, ...body];
  const ws = XLSX.utils.aoa_to_sheet(data);
  colWidths(ws, [6, 14, 28, 8, 16, 8, 18, 14, 14, 18, 18, 16, 24, 16, 18]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
  ];
  return ws;
}

const safeSheetName = (n: string) => n.replace(/[\\/?*:[\]]/g, ' ').slice(0, 31);

export function exportStudentsExcel(students: StudentRow[], module: ModuleType) {
  const wb = XLSX.utils.book_new();
  const title = module === 'id_card'
    ? 'តារាងសម្រង់ទិន្នន័យអត្តសញ្ញាណប័ណ្ណ'
    : 'តារាងសម្រង់ទិន្នន័យចុះឈ្មោះបោះឆ្នោត';
  XLSX.utils.book_append_sheet(wb, buildSheet(`សរុប — ${title}`, students, module), 'សរុប');

  const byClass = new Map<string, StudentRow[]>();
  students.forEach(s => {
    const k = s.classes?.name || 'គ្មានថ្នាក់';
    if (!byClass.has(k)) byClass.set(k, []);
    byClass.get(k)!.push(s);
  });

  for (const [cls, list] of byClass) {
    XLSX.utils.book_append_sheet(wb, buildSheet(`${cls} — ${title}`, list, module), safeSheetName(cls));
  }

  const filename = `${module === 'id_card' ? 'ID-Card' : 'Voter'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = ['ល.រ', 'ឈ្មោះសិស្ស', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'លេខអត្តសញ្ញាណប័ណ្ណ', 'ទូរស័ព្ទ', 'ភូមិ', 'ឃុំ/សង្កាត់', 'ស្រុក/ខណ្ឌ', 'ខេត្ត/រាជធានី', 'ផ្ទះលេខ/ផ្លូវ', 'ស្ថានភាព', 'លទ្ធផល'];
  const sample = [1, 'ឧទាហរណ៍ ស៊ីណា', 'ស្រី', '2008-05-15', '', '012345678', '', '', '', '', '', '', 'មិនទាន់បានធ្វើ'];
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  colWidths(ws, [6, 28, 8, 16, 18, 14, 14, 18, 18, 16, 24, 14, 18]);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'Student-Import-Template.xlsx');
}
