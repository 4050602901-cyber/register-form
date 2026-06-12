import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, CheckCircle, AlertTriangle, Search, Loader2,
  ChevronDown, Download, ArrowLeft, ClipboardList
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/fetchAll';
import { exportPendingExcel } from '../lib/excelExport';
import { pct } from '../lib/utils';
import { StudentRow } from '../types';
import Login from '../components/Login';
import StatCard from '../components/StatCard';

export default function PendingPage() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAll<StudentRow>(([from, to]) =>
        supabase
          .from('students')
          .select('id, student_code, name, gender, classroom, updated_by_student')
          .order('classroom', { ascending: true })
          .order('name', { ascending: true })
          .range(from, to)
      );
      setStudents(rows);
    } catch (e: any) {
      console.error('loadPending:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  const classrooms = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.classroom) set.add(s.classroom); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'km'));
  }, [students]);

  const stats = useMemo(() => {
    const total = students.length;
    const done = students.filter(s => s.updated_by_student).length;
    return { total, done, pending: total - done };
  }, [students]);

  // Per-class rows; the search box narrows the pending name lists and
  // hides classes without a match.
  const classRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return classrooms.map(c => {
      const list = students.filter(s => s.classroom === c);
      const done = list.filter(s => s.updated_by_student).length;
      let pending = list.filter(s => !s.updated_by_student);
      if (term) {
        pending = pending.filter(s =>
          s.name.toLowerCase().includes(term) ||
          (s.student_code || '').toLowerCase().includes(term));
      }
      return { classroom: c, total: list.length, done, pending };
    }).filter(r => !term || r.pending.length > 0);
  }, [classrooms, students, q]);

  function toggle(c: string) {
    const next = new Set(open);
    if (next.has(c)) next.delete(c); else next.add(c);
    setOpen(next);
  }

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }
  if (!session) return <Login />;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <a href="/" className="btn-ghost text-slate-600 -ml-2" aria-label="ត្រឡប់">
              <ArrowLeft size={18} />
            </a>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">តាមដានសិស្សមិនទាន់បំពេញទិន្នន័យ</h1>
              <p className="text-xs text-slate-500 hidden sm:block">ចុចលើថ្នាក់ ដើម្បីមើលឈ្មោះសិស្ស</p>
            </div>
          </div>
          <button
            className="btn-primary text-sm"
            onClick={() => exportPendingExcel(students, classrooms)}
            disabled={!students.length}
          >
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard title="សិស្សសរុប" value={stats.total} icon={<Users size={20} />} tone="blue" />
          <StatCard title="បានបំពេញរួច" value={stats.done} icon={<CheckCircle size={20} />} tone="green" />
          <StatCard title="មិនទាន់បំពេញ" value={stats.pending} icon={<AlertTriangle size={20} />} tone="red" />
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="ស្វែងរកឈ្មោះ ឬ លេខកូដ..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="card p-10 grid place-items-center"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : classRows.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            {q ? 'រកមិនឃើញ' : 'គ្មានទិន្នន័យ'}
          </div>
        ) : (
          <div className="space-y-2">
            {classRows.map(r => {
              const isOpen = open.has(r.classroom) || !!q.trim();
              const percent = pct(r.done, r.total);
              const allDone = r.total > 0 && r.done === r.total;
              return (
                <div key={r.classroom} className="card overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition"
                    onClick={() => toggle(r.classroom)}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${allDone ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      <ClipboardList size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{r.classroom}</p>
                        <p className="text-sm text-slate-500 shrink-0">
                          បានបំពេញ {r.done}/{r.total} • <span className={allDone ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{percent}</span>
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${allDone ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{ width: r.total ? `${Math.round((r.done / r.total) * 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full shrink-0">
                      {r.pending.length} នាក់
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    r.pending.length === 0 ? (
                      <p className="px-4 pb-4 text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle size={16} /> សិស្សទាំងអស់បានបំពេញរួចហើយ
                      </p>
                    ) : (
                      <ul className="px-4 pb-4 grid sm:grid-cols-2 gap-1.5">
                        {r.pending.map((s, i) => (
                          <li key={s.id} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                            <span className="text-slate-400 w-6 text-right shrink-0">{i + 1}.</span>
                            <span className="font-medium truncate">{s.name}</span>
                            <span className="text-xs text-slate-500 ml-auto shrink-0">
                              {s.student_code}{s.gender ? ` • ${s.gender}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
