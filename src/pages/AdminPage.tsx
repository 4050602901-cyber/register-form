import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, UserCheck, CheckCircle, AlertTriangle,
  Download, Upload, Search, Filter, LogOut, Loader2,
  Pencil, X, FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportTemplate } from '../lib/excelExport';
import { importStudentsFromExcel } from '../lib/excelImport';
import { ageText, calculateAge } from '../lib/utils';
import { fetchAll } from '../lib/fetchAll';
import { shortAddress } from '../lib/address';
import {
  StudentRow, ModuleType,
  ID_CARD_RESULTS, VOTER_RESULTS, VOTER_MIN_AGE, GENDERS,
  normalizeVoterResult
} from '../types';
import Login from '../components/Login';
import StatCard from '../components/StatCard';
import ClassroomList from '../components/ClassroomList';
import AddressSelect from '../components/AddressSelect';
import ExportPicker from '../components/ExportPicker';

const PAGE_SIZE = 50;
const STUDENT_SELECT = '*, provinces(*), districts(*), communes(*), villages(*)';

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [module, setModule] = useState<ModuleType>('id_card');
  const [classroom, setClassroom] = useState('');
  const [gender, setGender] = useState('');
  const [result, setResult] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [importClass, setImportClass] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const [edit, setEdit] = useState<StudentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAll<StudentRow>(([from, to]) =>
        supabase
          .from('students')
          .select(STUDENT_SELECT)
          .order('classroom', { ascending: true })
          .order('name', { ascending: true })
          .range(from, to)
      );
      setStudents(rows);
    } catch (e: any) {
      console.error('loadStudents:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session) loadStudents(); }, [session, loadStudents]);

  const classrooms = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.classroom) set.add(s.classroom); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'km'));
  }, [students]);

  const visible = useMemo(() => students.filter(s => {
    if (classroom && s.classroom !== classroom) return false;
    if (gender && s.gender !== gender) return false;
    if (module === 'voter') {
      const age = calculateAge(s.dob);
      if (age === null || age < VOTER_MIN_AGE) return false;
    }
    if (result) {
      const r = module === 'id_card' ? s.id_card_result : normalizeVoterResult(s.voter_result);
      if (r !== result) return false;
    }
    if (q) {
      const needle = q.toLowerCase();
      if (!s.name.toLowerCase().includes(needle) &&
          !(s.student_code || '').toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [students, classroom, gender, result, q, module]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [classroom, gender, result, q, module]);

  const stats = useMemo(() => {
    const total = visible.length;
    const female = visible.filter(s => s.gender === 'ស្រី').length;
    const completed = visible.filter(s => module === 'id_card'
      ? s.id_card_result === ID_CARD_RESULTS[0]
      : normalizeVoterResult(s.voter_result) === VOTER_RESULTS[0]
    ).length;
    return { total, female, completed, pending: total - completed };
  }, [visible, module]);

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !importClass) { alert('សូមជ្រើសថ្នាក់ជាមុនសិន'); return; }
    setImporting(true);
    setImportMsg('');
    try {
      const r = await importStudentsFromExcel(file, importClass);
      setImportMsg(`បានបញ្ចូល ${r.inserted}/${r.total} សិស្ស${r.errors.length ? ` (${r.errors.length} កំហុស)` : ''} ✅`);
      await loadStudents();
    } catch (err: any) {
      setImportMsg(`បរាជ័យ: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    const { id, provinces: _p, districts: _d, communes: _cm, villages: _v, ...rest } = edit as any;
    rest.voter_result = normalizeVoterResult(rest.voter_result);
    const { error } = await supabase.from('students').update(rest).eq('id', id);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setEdit(null);
    await loadStudents();
  }

  async function removeStudent(s: StudentRow) {
    if (!confirm(`លុបសិស្ស "${s.name}"?`)) return;
    const { error } = await supabase.from('students').delete().eq('id', s.id);
    if (error) { alert(error.message); return; }
    await loadStudents();
  }

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }
  if (!session) return <Login />;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">ផ្ទាំងគ្រប់គ្រងសិស្ស</h1>
            <p className="text-xs text-slate-500 hidden sm:block">បញ្ចូល • តាមដាន • របាយការណ៍</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/student" target="_blank" rel="noreferrer" className="btn-soft text-sm hidden sm:inline-flex">បើកទម្រង់</a>
            <button className="btn-ghost text-slate-600" onClick={() => supabase.auth.signOut()} aria-label="ចាកចេញ">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="សរុប" value={stats.total} icon={<Users size={20} />} tone="blue" />
          <StatCard title="ស្រី" value={stats.female} icon={<UserCheck size={20} />} tone="amber" />
          <StatCard title="បានធ្វើរួច" value={stats.completed} icon={<CheckCircle size={20} />} tone="green" />
          <StatCard title="មិនទាន់" value={stats.pending} icon={<AlertTriangle size={20} />} tone="red" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <ClassroomList />

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">នាំចូល Excel</h2>
              <button className="btn-ghost text-blue-600 text-sm" onClick={exportTemplate}>
                <FileSpreadsheet size={16} /> Template
              </button>
            </div>
            <input
              className="input"
              placeholder="ឈ្មោះថ្នាក់ (ឧ. 12A)"
              value={importClass}
              onChange={e => setImportClass(e.target.value)}
              list="classroom-options"
            />
            <datalist id="classroom-options">
              {classrooms.map(c => <option key={c} value={c} />)}
            </datalist>
            <label className={`btn-primary cursor-pointer ${(!importClass || importing) ? 'opacity-50 pointer-events-none' : ''}`}>
              {importing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              {importing ? 'កំពុងបញ្ចូល...' : 'ជ្រើស Excel'}
              <input type="file" hidden accept=".xlsx,.xls" onChange={handleImport} />
            </label>
            {importMsg && <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{importMsg}</p>}
            <p className="text-xs text-slate-500">
              ជួរទាមទារ: ឈ្មោះ។ ជួរស្រេចចិត្ត: ភេទ, ថ្ងៃកំណើត, លេខអត្តសញ្ញាណប័ណ្ណ, ខេត្ត, ស្រុក, ឃុំ, ភូមិ, ថ្នាក់
            </p>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="ស្វែងរកឈ្មោះ ឬ លេខកូដ..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <button className="btn-soft sm:hidden" onClick={() => setShowFilters(s => !s)}>
              <Filter size={18} />
            </button>
            <button
              className="btn-primary hidden sm:inline-flex"
              onClick={() => setExportOpen(true)}
              disabled={!classrooms.length}
            >
              <Download size={18} /> Export
            </button>
          </div>

          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2 ${showFilters ? '' : 'hidden sm:grid'}`}>
            <select className="input" value={module} onChange={e => setModule(e.target.value as ModuleType)}>
              <option value="id_card">អត្តសញ្ញាណប័ណ្ណ</option>
              <option value="voter">ចុះឈ្មោះបោះឆ្នោត</option>
            </select>
            <select className="input" value={classroom} onChange={e => setClassroom(e.target.value)}>
              <option value="">គ្រប់ថ្នាក់</option>
              {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">គ្រប់ភេទ</option>
              {GENDERS.map(g => <option key={g}>{g}</option>)}
            </select>
            <select className="input" value={result} onChange={e => setResult(e.target.value)}>
              <option value="">គ្រប់លទ្ធផល</option>
              {(module === 'id_card' ? ID_CARD_RESULTS : VOTER_RESULTS).map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <button
            className="btn-primary w-full sm:hidden"
            onClick={() => setExportOpen(true)}
            disabled={!classrooms.length}
          >
            <Download size={18} /> Export
          </button>
        </div>

        {/* Table — desktop */}
        <div className="card overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead><tr>
                <th className="th">ល.រ</th>
                <th className="th">លេខកូដ</th>
                <th className="th">ឈ្មោះ</th>
                <th className="th">ភេទ</th>
                <th className="th">អាយុ</th>
                <th className="th">ថ្នាក់</th>
                <th className="th">អាសយដ្ឋាន</th>
                <th className="th">លទ្ធផល</th>
                <th className="th"></th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="td text-center py-10"><Loader2 className="animate-spin inline" /></td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={9} className="td text-center py-10 text-slate-400">គ្មានទិន្នន័យ</td></tr>
                ) : pageRows.map((s, i) => {
                  const r = module === 'id_card' ? s.id_card_result : normalizeVoterResult(s.voter_result);
                  const done = r === (module === 'id_card' ? ID_CARD_RESULTS[0] : VOTER_RESULTS[0]);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="td">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="td text-xs text-slate-500">{s.student_code}</td>
                      <td className="td font-medium">{s.name}</td>
                      <td className="td">{s.gender || '—'}</td>
                      <td className="td">{ageText(s.dob) || '—'}</td>
                      <td className="td">{s.classroom || '—'}</td>
                      <td className="td max-w-[280px] truncate" title={shortAddress(s)}>{shortAddress(s) || '—'}</td>
                      <td className="td">
                        <span className={`chip ${done ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{r || '—'}</span>
                      </td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button className="btn-ghost text-blue-600" onClick={() => setEdit(s)} aria-label="កែ"><Pencil size={16} /></button>
                          <button className="btn-ghost text-red-600" onClick={() => removeStudent(s)} aria-label="លុប"><X size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards — mobile */}
        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="card p-6 text-center"><Loader2 className="animate-spin inline text-blue-600" /></div>
          ) : pageRows.length === 0 ? (
            <div className="card p-6 text-center text-slate-400">គ្មានទិន្នន័យ</div>
          ) : pageRows.map((s, i) => {
            const r = module === 'id_card' ? s.id_card_result : normalizeVoterResult(s.voter_result);
            const done = r === (module === 'id_card' ? ID_CARD_RESULTS[0] : VOTER_RESULTS[0]);
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{(page - 1) * PAGE_SIZE + i + 1}. {s.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.student_code} • {s.gender || '—'} • {ageText(s.dob) || '—'} • {s.classroom || '—'}
                    </p>
                    {shortAddress(s) && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{shortAddress(s)}</p>
                    )}
                    <span className={`chip mt-2 ${done ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{r || '—'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="btn-ghost text-blue-600" onClick={() => setEdit(s)}><Pencil size={16} /></button>
                    <button className="btn-ghost text-red-600" onClick={() => removeStudent(s)}><X size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button className="btn-soft" disabled={page === 1} onClick={() => setPage(p => p - 1)}>មុន</button>
            <span className="text-sm text-slate-600">ទំព័រ {page} / {totalPages}</span>
            <button className="btn-soft" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>បន្ទាប់</button>
          </div>
        )}
      </main>

      {edit && (
        <EditModal
          student={edit}
          module={module}
          saving={saving}
          classrooms={classrooms}
          onClose={() => setEdit(null)}
          onChange={setEdit}
          onSave={saveEdit}
        />
      )}

      {exportOpen && (
        <ExportPicker
          module={module}
          classrooms={classrooms}
          students={students}
          initialClassroom={classroom || undefined}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

function EditModal({
  student, module, saving, classrooms, onClose, onChange, onSave
}: {
  student: StudentRow;
  module: ModuleType;
  saving: boolean;
  classrooms: string[];
  onClose: () => void;
  onChange: (s: StudentRow) => void;
  onSave: () => void;
}) {
  const set = <K extends keyof StudentRow>(k: K, v: StudentRow[K]) => onChange({ ...student, [k]: v });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full grid place-items-center p-4">
        <div className="card p-5 max-w-2xl w-full space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">កែព័ត៌មានសិស្ស</h2>
            <button className="btn-ghost" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">ឈ្មោះសិស្ស</label>
              <input className="input" value={student.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">លេខកូដសិស្ស</label>
              <input className="input" value={student.student_code} onChange={e => set('student_code', e.target.value)} />
            </div>
            <div>
              <label className="label">ថ្នាក់</label>
              <input className="input" value={student.classroom || ''} onChange={e => set('classroom', e.target.value)} list="edit-classroom-options" />
              <datalist id="edit-classroom-options">
                {classrooms.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="label">ភេទ</label>
              <select className="input" value={student.gender || ''} onChange={e => set('gender', e.target.value)}>
                <option value="">—</option>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ថ្ងៃខែឆ្នាំកំណើត</label>
              <input type="date" className="input" value={student.dob || ''} onChange={e => set('dob', e.target.value || null)} />
            </div>
            <div>
              <label className="label">លេខអត្តសញ្ញាណប័ណ្ណ</label>
              <input className="input" value={student.id_card_number || ''} onChange={e => set('id_card_number', e.target.value || null)} />
            </div>
            <div>
              <label className="label">ទូរស័ព្ទ</label>
              <input className="input" value={student.phone || ''} onChange={e => set('phone', e.target.value || null)} />
            </div>
            {module === 'voter' && (
              <div className="sm:col-span-2">
                <label className="label">ថ្ងៃចុះឈ្មោះចុងក្រោយ</label>
                <input type="date" className="input" value={student.final_registration_date || ''} onChange={e => set('final_registration_date', e.target.value || null)} />
              </div>
            )}
            <div className="sm:col-span-2">
              <AddressSelect value={student} onChange={p => onChange({ ...student, ...p })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">លទ្ធផល</label>
              <select
                className="input"
                value={(module === 'id_card' ? student.id_card_result : normalizeVoterResult(student.voter_result)) || ''}
                onChange={e => set(module === 'id_card' ? 'id_card_result' : 'voter_result', e.target.value)}
              >
                {(module === 'id_card' ? ID_CARD_RESULTS : VOTER_RESULTS).map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-soft flex-1" onClick={onClose}>បោះបង់</button>
            <button className="btn-primary flex-1" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : null}
              រក្សាទុក
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
