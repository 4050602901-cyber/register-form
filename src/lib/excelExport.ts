import * as XLSX from 'xlsx';
import {
  StudentRow, ModuleType,
  VOTER_RESULTS, ID_CARD_RESULTS, VOTER_MIN_AGE,
  normalizeVoterResult, hasResidence
} from '../types';
import { calculateAge } from './utils';

// ID-card eligibility starts at 15 (រដ្ឋប្បវេណីខ្មែរ)
const ID_CARD_MIN_AGE = 15;

// Grade 12 classes are taken in full regardless of age; all other grades
// keep the 18+ voter age condition.
const isGrade12 = (classroom?: string | null): boolean =>
  !!classroom && classroom.trim().startsWith('12');

function isVoterEligible(s: StudentRow, asOf: Date): boolean {
  if (isGrade12(s.classroom)) return true;
  const a = calculateAge(s.dob, asOf);
  return a !== null && a >= VOTER_MIN_AGE;
}

// Result to print in the voter report: students still under 18 as of the
// reference date are auto-filled as "not old enough to register",
// whatever the stored value says.
function effectiveVoterResult(s: StudentRow, asOf: Date): string {
  const a = calculateAge(s.dob, asOf);
  if (a !== null && a < VOTER_MIN_AGE) return VOTER_RESULTS[2];
  return normalizeVoterResult(s.voter_result) || '';
}

// Same for the ID-card report: under 15 as of the reference date is
// auto-filled as "not old enough to make one".
function effectiveIdCardResult(s: StudentRow, asOf: Date): string {
  const a = calculateAge(s.dob, asOf);
  if (a !== null && a < ID_CARD_MIN_AGE) return ID_CARD_RESULTS[2];
  return s.id_card_result || '';
}

const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មិនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

function fmtDateShort(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function ageYM(dob: string | null | undefined, asOf: Date): string {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  let years = asOf.getFullYear() - birth.getFullYear();
  let months = asOf.getMonth() - birth.getMonth();
  if (asOf.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return `${years}ឆ្នាំ${months}ខែ`;
}

function shortAddr(s: StudentRow): string {
  const parts = [
    s.villages?.name_km && `ភូមិ${s.villages.name_km}`,
    s.communes?.name_km && `ឃុំ${s.communes.name_km}`
  ].filter(Boolean) as string[];
  return parts.join(' ');
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function dateKh(t: Date) {
  return { d: t.getDate(), m: KHMER_MONTHS[t.getMonth()], y: t.getFullYear() };
}

function pctStr(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : '';
}

const safeSheetName = (n: string) => n.replace(/[\\/?*:[\]]/g, ' ').slice(0, 31);

// ─────────────────────────────────────────────────────────────────────────────
// VOTER — per-class sheet (9 columns: A–I)
// ─────────────────────────────────────────────────────────────────────────────
function voterClassSheet(students: StudentRow[], classroom: string, asOf: Date): XLSX.WorkSheet {
  const t = dateKh(asOf);
  const title = `តារាងសម្រង់ទិន្នន័យលទ្ធផលសិស្សដែលត្រូវចុះឈ្មោះបោះឆ្នោត\nថ្នាក់ទី ${classroom}  គិតត្រឹមថ្ងៃទី${t.d}  ខែ${t.m}  ឆ្នាំ${t.y}`;

  const headers = [
    'ល.រ', 'គោត្តនាម-នាម', 'ភេទ',
    'លេខអត្តសញ្ញាណ\nប័ណ្ណសញ្ជាតិខ្មែរ',
    'ថ្ងៃខែឆ្នាំកំណើត\n(សំបុត្រកំណើត)',
    'ថ្ងៃ ខែ ឆ្នាំ\n(ត្រូវចុះឈ្មោះ\nបោះឆ្នោត\nចុងក្រោយ)',
    'អាយុ\n(ឆ្នាំ និងខែ)',
    'អាសយដ្ឋានបច្ចុប្បន្ន\n(ភូមិ និងឃុំ)',
    'លទ្ធផល'
  ];

  const eligible = students.filter(s => isVoterEligible(s, asOf));

  const defaultRegDate = fmtDateShort(asOf);

  const data: (string | number)[][] = [[title], headers];
  eligible.forEach((s, i) => {
    data.push([
      i + 1,
      s.name,
      s.gender || '',
      s.id_card_number || '',
      fmtDateShort(s.dob),
      s.final_registration_date ? fmtDateShort(s.final_registration_date) : defaultRegDate,
      ageYM(s.dob, asOf),
      shortAddr(s),
      effectiveVoterResult(s, asOf)
    ]);
  });

  // Spacer
  data.push([]);
  data.push([]);

  // Summary block (matches template exactly)
  const eligibleTotal = eligible.length;
  const registered    = eligible.filter(s => effectiveVoterResult(s, asOf) === VOTER_RESULTS[0]).length;
  const notRegistered = eligible.filter(s => effectiveVoterResult(s, asOf) === VOTER_RESULTS[1]).length;
  const underAge      = eligible.filter(s => effectiveVoterResult(s, asOf) === VOTER_RESULTS[2]).length;

  data.push(['', 'ចំនួនយុវជនដែលមានអាយុត្រូវចុះឈ្មោះបោះឆ្នោត', '', '', '', eligibleTotal, '%', '', '']);
  data.push(['', 'ចំនួនយុវជនដែលបានចុះឈ្មោះបោះឆ្នោតរួច', '', '', '', registered, pctStr(registered, eligibleTotal), '', '']);
  data.push([]);
  data.push(['', 'ចំនួនយុវជនដែលមិនទាន់បានចុះឈ្មោះបោះឆ្នោត', '', '', '', notRegistered, '', '', '']);
  data.push(['', 'ចំនួនយុវជនដែលមិនទាន់គ្រប់អាយុត្រូវចុះឈ្មោះ', '', '', '', underAge, '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: 8, r: 0 } }]; // title spans A–I
  setColWidths(ws, [5, 24, 6, 16, 14, 16, 13, 28, 22]);
  ws['!rows'] = [{ hpt: 60 }, { hpt: 60 }];
  return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// ID CARD — per-class sheet (8 columns: A–H)
// ─────────────────────────────────────────────────────────────────────────────
function idCardClassSheet(students: StudentRow[], classroom: string, asOf: Date): XLSX.WorkSheet {
  const t = dateKh(asOf);
  const title = `តារាងសម្រង់ទិន្នន័យលទ្ធផលសិស្សដែលបានធ្វើអត្តសញ្ញាណប័ណ្ណ\nថ្នាក់ទី ${classroom} គិតត្រឹមថ្ងៃទី${t.d} ខែ${t.m} ឆ្នាំ${t.y}`;

  const headers = [
    'ល.រ', 'គោត្តនាម-នាម', 'ភេទ',
    'ថ្ងៃខែឆ្នាំកំណើត\n(សំបុត្រកំណើត)',
    'អាយុ\n(ឆ្នាំ)',
    'ស្ថានភាពជាក់ស្ដែង',
    'អាសយដ្ឋានបច្ចុប្បន្ន\n(ភូមិ និងឃុំ)',
    'លទ្ធផល'
  ];

  const data: (string | number)[][] = [[title], headers];
  students.forEach((s, i) => {
    const age = calculateAge(s.dob, asOf);
    const realStatus = s.real_status
      ?? (age !== null && age >= ID_CARD_MIN_AGE ? 'ត្រូវធ្វើអត្តសញ្ញាណប័ណ្ណ' : '');
    data.push([
      i + 1,
      s.name,
      s.gender || '',
      fmtDateShort(s.dob),
      age !== null ? age : '',
      realStatus,
      shortAddr(s),
      effectiveIdCardResult(s, asOf)
    ]);
  });

  data.push([]);
  data.push([]);

  const mustMake = students.filter(s => {
    const a = calculateAge(s.dob, asOf);
    return a !== null && a >= ID_CARD_MIN_AGE;
  }).length;
  const tooYoung = students.filter(s => {
    const a = calculateAge(s.dob, asOf);
    return a !== null && a < ID_CARD_MIN_AGE;
  }).length;
  const done    = students.filter(s => effectiveIdCardResult(s, asOf) === ID_CARD_RESULTS[0]).length;
  const notDone = students.filter(s => effectiveIdCardResult(s, asOf) === ID_CARD_RESULTS[1]).length;

  data.push(['', '', 'បរិយាយ', '', '', 'លទ្ធផល', '', '']);
  data.push(['', '', '$1', 'ចំនួនយុវជនដែលត្រូវធ្វើអត្តញ្ញាណ\nប័ណ្ណសញ្ជាតិខ្មែរ', '', mustMake, '', '']);
  data.push(['', '', '$2', 'ចំនួនយុវជនដែលមិនទាន់គ្រប់\nអាយុត្រូវធ្វើអត្តសញ្ញាណប័ណ្ណ', '', tooYoung, '', '']);
  data.push(['', '', '$3', 'ចំនួនយុវជនដែលមាន ឬបានធ្វើ\nអត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ', '', done, '', '']);
  data.push(['', '', '$4', 'ចំនួនយុវជនដែលមិនទាន់បានធ្វើ\nអត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ', '', notDone, '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: 7, r: 0 } }]; // title spans A–H
  setColWidths(ws, [5, 24, 6, 14, 8, 24, 28, 22]);
  ws['!rows'] = [{ hpt: 60 }, { hpt: 50 }];
  return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// VOTER — Total sheet
// ─────────────────────────────────────────────────────────────────────────────
function totalVoter(students: StudentRow[], classrooms: string[], asOf: Date): XLSX.WorkSheet {
  const t = dateKh(asOf);
  const title = `តារាងលទ្ធផលយុវជនដែលបានចុះឈ្មោះបោះឆ្នោត តាមកម្រិតថ្នាក់\nសម្រាប់ឆ្នាំសិក្សា${t.y - 1}-${t.y}\n (គិតត្រឹមថ្ងៃទី${t.d} ខែ${t.m}  ឆ្នាំ${t.y})`;

  const data: (string | number)[][] = [
    [title],
    ['ល.រ', 'កម្រិតថ្នាក់', 'ចំនួនសិស្សសរុប', '', 'លទ្ធផលការចុះឈ្មោះបោះឆ្នោត (ចំនួនសិស្ស)', '', '', '', '', ''],
    ['', '', 'សរុប', 'ស្រី', 'បានចុះរួច', '%', 'មិនទាន់\nបានចុះឈ្មោះ', '%', 'មិនទាន់គ្រប់អាយុ\nត្រូវចុះឈ្មោះ', '%']
  ];

  let tTot = 0, tFem = 0, tReg = 0, tNotReg = 0, tNoId = 0;
  classrooms.forEach((c, i) => {
    const list = students.filter(s => s.classroom === c);
    const eligible = list.filter(s => isVoterEligible(s, asOf));
    const female  = list.filter(s => s.gender === 'ស្រី').length;
    const reg     = eligible.filter(s => effectiveVoterResult(s, asOf) === VOTER_RESULTS[0]).length;
    const notReg  = eligible.filter(s => effectiveVoterResult(s, asOf) === VOTER_RESULTS[1]).length;
    const noId    = eligible.filter(s => effectiveVoterResult(s, asOf) === VOTER_RESULTS[2]).length;
    tTot += list.length; tFem += female; tReg += reg; tNotReg += notReg; tNoId += noId;

    data.push([
      i + 1, c, list.length, female,
      reg,    pctStr(reg, eligible.length),
      notReg, pctStr(notReg, eligible.length),
      noId,   pctStr(noId, eligible.length)
    ]);
  });

  data.push(['សរុបរួម', '', tTot, tFem, tReg, '', tNotReg, '', tNoId, '']);
  data.push([]);
  data.push(['', '', '', '', `ថ្ងៃទី${t.d}   ខែ${t.m}   ឆ្នាំ${t.y}`, '', '', '', '', '']);
  data.push(['', '', '', '', '', '', 'នាយក នាយិកាវិទ្យាល័យ', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = [
    { s: { c: 0, r: 0 }, e: { c: 9, r: 0 } }, // title
    { s: { c: 0, r: 1 }, e: { c: 0, r: 2 } }, // ល.រ
    { s: { c: 1, r: 1 }, e: { c: 1, r: 2 } }, // កម្រិតថ្នាក់
    { s: { c: 2, r: 1 }, e: { c: 3, r: 1 } }, // ចំនួនសិស្សសរុប
    { s: { c: 4, r: 1 }, e: { c: 9, r: 1 } }  // លទ្ធផល
  ];
  setColWidths(ws, [5, 22, 8, 8, 12, 6, 14, 6, 14, 6]);
  ws['!rows'] = [{ hpt: 60 }, { hpt: 30 }, { hpt: 50 }];
  return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// ID CARD — Total sheet
// ─────────────────────────────────────────────────────────────────────────────
function totalIdCard(students: StudentRow[], classrooms: string[], asOf: Date): XLSX.WorkSheet {
  const t = dateKh(asOf);
  const title = `តារាងលទ្ធផលយុវជនដែលបានធ្វើអត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ តាមកម្រិតថ្នាក់\nសម្រាប់ឆ្នាំសិក្សា${t.y - 1}-${t.y}\n (គិតត្រឹមថ្ងៃទី${t.d}  ខែ${t.m}   ឆ្នាំ${t.y})`;

  const data: (string | number)[][] = [
    [title],
    ['ល.រ', 'កម្រិតថ្នាក់', 'ចំនួនសិស្សសរុប', '', 'លទ្ធផលការធ្វើអត្តសញ្ញាណប័ណ្ណ (ចំនួនសិស្ស)', '', '', '', '', ''],
    ['', '', 'សរុប', 'ស្រី', 'បានធ្វើរួច', '%', 'មិនទាន់\nបានធ្វើ', '%', 'មិនទាន់ដល់\nអាយុត្រូវធ្វើ', '%']
  ];

  let tTot = 0, tFem = 0, tDone = 0, tNotDone = 0, tYoung = 0;
  classrooms.forEach((c, i) => {
    const list   = students.filter(s => s.classroom === c);
    const female = list.filter(s => s.gender === 'ស្រី').length;
    const done   = list.filter(s => effectiveIdCardResult(s, asOf) === ID_CARD_RESULTS[0]).length;
    const notDone = list.filter(s => effectiveIdCardResult(s, asOf) === ID_CARD_RESULTS[1]).length;
    const young  = list.filter(s => effectiveIdCardResult(s, asOf) === ID_CARD_RESULTS[2]).length;
    tTot += list.length; tFem += female; tDone += done; tNotDone += notDone; tYoung += young;

    data.push([
      i + 1, c, list.length, female,
      done,    pctStr(done, list.length),
      notDone, pctStr(notDone, list.length),
      young,   pctStr(young, list.length)
    ]);
  });

  data.push(['សរុបរួម', '', tTot, tFem, tDone, '', tNotDone, '', tYoung, '']);
  data.push([]);
  data.push(['', '', '', '', `ថ្ងៃទី${t.d}    ខែ${t.m}    ឆ្នាំ${t.y}`, '', '', '', '', '']);
  data.push(['', '', '', '', '', '', 'នាយក នាយិកាវិទ្យាល័យ', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = [
    { s: { c: 0, r: 0 }, e: { c: 9, r: 0 } },
    { s: { c: 0, r: 1 }, e: { c: 0, r: 2 } },
    { s: { c: 1, r: 1 }, e: { c: 1, r: 2 } },
    { s: { c: 2, r: 1 }, e: { c: 3, r: 1 } },
    { s: { c: 4, r: 1 }, e: { c: 9, r: 1 } }
  ];
  setColWidths(ws, [5, 22, 8, 8, 12, 6, 14, 6, 14, 6]);
  ws['!rows'] = [{ hpt: 60 }, { hpt: 30 }, { hpt: 50 }];
  return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────
export function exportStudentsExcel(
  students: StudentRow[],
  module: ModuleType,
  classrooms: string[],
  asOf: Date = new Date()
): void {
  if (!classrooms.length) throw new Error('សូមជ្រើសថ្នាក់យ៉ាងហោចណាស់មួយ');

  const wb = XLSX.utils.book_new();

  const totalWs = module === 'voter'
    ? totalVoter(students, classrooms, asOf)
    : totalIdCard(students, classrooms, asOf);
  XLSX.utils.book_append_sheet(wb, totalWs, 'Total');

  for (const cls of classrooms) {
    const classStudents = students.filter(s => s.classroom === cls);
    const ws = module === 'voter'
      ? voterClassSheet(classStudents, cls, asOf)
      : idCardClassSheet(classStudents, cls, asOf);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(`Grade ${cls}`));
  }

  const today = new Date().toISOString().slice(0, 10);
  const prefix = module === 'voter'
    ? 'តារាងសម្រង់ទិន្នន័យយុវជនចុះឈ្មោះបោះឆ្នោត'
    : 'តារាងសម្រង់ទិន្នន័យយុវជនដែលបានធ្វើអត្តសញ្ញាណប័ណ្ណ';
  XLSX.writeFile(wb, `${prefix}_${today}.xlsx`);
}

// Workbook for the "not yet filled in" tracking page: a per-class summary
// sheet plus the name list of students without residence data.
export function exportPendingExcel(students: StudentRow[], classrooms: string[]): void {
  const t = dateKh(new Date());
  const wb = XLSX.utils.book_new();

  const sum: (string | number)[][] = [
    [`តារាងសង្ខេបសិស្សដែលមិនទាន់បានបំពេញទិន្នន័យ\n(គិតត្រឹមថ្ងៃទី${t.d} ខែ${t.m} ឆ្នាំ${t.y})`],
    ['ល.រ', 'ថ្នាក់', 'សិស្សសរុប', 'បានបំពេញ', 'មិនទាន់បំពេញ', '% បានបំពេញ']
  ];
  let tTot = 0, tDone = 0;
  classrooms.forEach((c, i) => {
    const list = students.filter(s => s.classroom === c);
    const done = list.filter(hasResidence).length;
    tTot += list.length; tDone += done;
    sum.push([i + 1, c, list.length, done, list.length - done, pctStr(done, list.length)]);
  });
  sum.push(['សរុបរួម', '', tTot, tDone, tTot - tDone, pctStr(tDone, tTot)]);
  const wsSum = XLSX.utils.aoa_to_sheet(sum);
  wsSum['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: 5, r: 0 } }];
  setColWidths(wsSum, [6, 14, 12, 12, 14, 12]);
  wsSum['!rows'] = [{ hpt: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSum, 'សង្ខេប');

  const rows: (string | number)[][] = [
    [`បញ្ជីឈ្មោះសិស្សដែលមិនទាន់បានបំពេញទិន្នន័យ (គិតត្រឹមថ្ងៃទី${t.d} ខែ${t.m} ឆ្នាំ${t.y})`],
    ['ល.រ', 'លេខកូដ', 'គោត្តនាម-នាម', 'ភេទ', 'ថ្នាក់']
  ];
  let i = 0;
  for (const c of classrooms) {
    const pending = students
      .filter(s => s.classroom === c && !hasResidence(s))
      .sort((a, b) => a.name.localeCompare(b.name, 'km'));
    for (const s of pending) {
      rows.push([++i, s.student_code || '', s.name, s.gender || '', s.classroom || '']);
    }
  }
  const wsList = XLSX.utils.aoa_to_sheet(rows);
  wsList['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: 4, r: 0 } }];
  setColWidths(wsList, [6, 14, 28, 8, 12]);
  XLSX.utils.book_append_sheet(wb, wsList, 'បញ្ជីឈ្មោះ');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `សិស្សមិនទាន់បំពេញទិន្នន័យ_${today}.xlsx`);
}

export function exportTemplate(): void {
  const wb = XLSX.utils.book_new();
  const headers = [
    'លេខកូដ', 'ឈ្មោះសិស្ស', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ថ្នាក់',
    'លេខអត្តសញ្ញាណប័ណ្ណ', 'ទូរស័ព្ទ',
    'ភូមិ', 'ឃុំ/សង្កាត់', 'ស្រុក/ខណ្ឌ', 'ខេត្ត/រាជធានី',
    'ផ្ទះលេខ/ផ្លូវ', 'ស្ថានភាព', 'លទ្ធផល'
  ];
  const sample = ['', 'ឧទាហរណ៍ ស៊ីណា', 'ស្រី', '2008-05-15', '12A', '', '012345678', '', '', '', '', '', '', 'មិនទាន់បានធ្វើ'];
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  setColWidths(ws, [14, 28, 8, 16, 12, 18, 14, 14, 18, 18, 16, 24, 14, 18]);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'Student-Import-Template.xlsx');
}
