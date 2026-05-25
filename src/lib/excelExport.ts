import * as XLSX from 'xlsx';
import { StudentRow, ModuleType } from '../types';
import { ageText } from './utils';
import { formatKhmerAddress } from './address';

function styleSheet(ws:XLSX.WorkSheet, widths:number[]) { ws['!cols'] = widths.map(w => ({ wch:w })); }
function rowsFor(students:StudentRow[], module:ModuleType) {
  const headers = module === 'id_card'
    ? ['ល.រ','ថ្នាក់','ឈ្មោះសិស្ស','ភេទ','ថ្ងៃខែឆ្នាំកំណើត','អាយុ','ស្ថានភាព','អាសយដ្ឋាន','លទ្ធផល']
    : ['ល.រ','ថ្នាក់','ឈ្មោះសិស្ស','ភេទ','លេខអត្តសញ្ញាណប័ណ្ណ','ថ្ងៃខែឆ្នាំកំណើត','ថ្ងៃចុះឈ្មោះចុងក្រោយ','អាយុ','អាសយដ្ឋាន','លទ្ធផល'];
  const body = students.map((s,i) => module === 'id_card'
    ? [s.no ?? i+1, s.classes?.name ?? '', s.student_name, s.gender ?? '', s.date_of_birth ?? '', ageText(s.date_of_birth), s.real_status ?? '', formatKhmerAddress(s), s.id_card_result ?? '']
    : [s.no ?? i+1, s.classes?.name ?? '', s.student_name, s.gender ?? '', s.id_card_number ?? '', s.date_of_birth ?? '', s.final_registration_date ?? '', ageText(s.date_of_birth), formatKhmerAddress(s), s.voter_result ?? '']
  );
  return { headers, body };
}
function makeSheet(title:string, students:StudentRow[], module:ModuleType) {
  const { headers, body } = rowsFor(students, module);
  const total = students.length, female = students.filter(s => s.gender === 'ស្រី').length;
  const completed = students.filter(s => (module==='id_card'?s.id_card_result:s.voter_result)?.includes('រួច')).length;
  const data = [[title], [`សរុប: ${total} | ស្រី: ${female} | រួច: ${completed} | មិនទាន់: ${total-completed}`], [], headers, ...body];
  const ws = XLSX.utils.aoa_to_sheet(data);
  styleSheet(ws, module==='id_card' ? [8,12,28,10,18,10,18,30,24] : [8,12,28,10,20,18,20,10,30,28]);
  ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:headers.length-1}}];
  return ws;
}
export function exportStudentsExcel(students:StudentRow[], module:ModuleType) {
  const wb = XLSX.utils.book_new();
  const title = module === 'id_card' ? 'តារាងសម្រង់ទិន្នន័យយុវជនដែលបានធ្វើអត្តសញ្ញាណប័ណ្ណ' : 'តារាងសម្រង់ទិន្នន័យចុះឈ្មោះបោះឆ្នោត';
  XLSX.utils.book_append_sheet(wb, makeSheet(`សរុប - ${title}`, students, module), 'Total');
  const classes = Array.from(new Set(students.map(s => s.classes?.name || 'No Class')));
  classes.forEach(c => XLSX.utils.book_append_sheet(wb, makeSheet(`${c} - ${title}`, students.filter(s => (s.classes?.name || 'No Class') === c), module), c.slice(0,31)));
  XLSX.writeFile(wb, `${module === 'id_card' ? 'ID-Card' : 'Voter'}-Report.xlsx`);
}
