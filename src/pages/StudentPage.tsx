import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle, Loader2, GraduationCap, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/fetchAll';
import { calculateAge } from '../lib/utils';
import {
  StudentRow, ModuleType,
  ID_CARD_RESULTS, VOTER_RESULTS, VOTER_MIN_AGE, GENDERS
} from '../types';
import AddressSelect from '../components/AddressSelect';

const STUDENT_SELECT = '*, provinces(*), districts(*), communes(*), villages(*)';

export default function StudentPage() {
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [classroom, setClassroom] = useState('');
  const [classroomLocked, setClassroomLocked] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [module, setModule] = useState<ModuleType>('id_card');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load all classrooms (distinct) + handle ?class= query param.
  // If a class is encoded in the URL (came from a per-classroom QR), lock it
  // so the student cannot switch to a different classroom.
  useEffect(() => {
    (async () => {
      const data = await fetchAll<{ classroom: string }>(([from, to]) =>
        supabase
          .from('students')
          .select('classroom')
          .not('classroom', 'is', null)
          .range(from, to)
      );
      const set = new Set<string>();
      data.forEach(r => { if (r.classroom) set.add(r.classroom); });
      const list = Array.from(set).sort((a, b) => a.localeCompare(b, 'km'));
      setClassrooms(list);
      const param = new URLSearchParams(location.search).get('class');
      if (param) {
        const decoded = decodeURIComponent(param);
        if (list.includes(decoded)) {
          setClassroom(decoded);
          setClassroomLocked(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!classroom) { setStudents([]); return; }
    setLoading(true);
    fetchAll<StudentRow>(([from, to]) =>
      supabase
        .from('students')
        .select(STUDENT_SELECT)
        .eq('classroom', classroom)
        .order('name')
        .range(from, to)
    ).then(rows => {
      setStudents(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [classroom]);

  // Voter module only lists students aged 18+
  const ageFiltered = useMemo(() => {
    if (module !== 'voter') return students;
    return students.filter(s => {
      const age = calculateAge(s.dob);
      return age !== null && age >= VOTER_MIN_AGE;
    });
  }, [students, module]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ageFiltered.slice(0, 60);
    return ageFiltered.filter(s => s.name.toLowerCase().includes(term) ||
      (s.student_code || '').toLowerCase().includes(term)).slice(0, 60);
  }, [ageFiltered, q]);

  const setField = <K extends keyof StudentRow>(k: K, v: StudentRow[K]) => {
    if (selected) setSelected({ ...selected, [k]: v });
  };

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!selected || saving) return;
    setSaving(true);

    const update: Partial<StudentRow> = {
      name: selected.name,
      gender: selected.gender,
      dob: selected.dob,
      id_card_number: selected.id_card_number,
      phone: selected.phone,
      address: selected.address,
      province_id: selected.province_id,
      district_id: selected.district_id,
      commune_id: selected.commune_id,
      village_id: selected.village_id,
      updated_by_student: true
    };

    if (module === 'id_card') {
      update.id_card_result = selected.id_card_result;
    } else {
      update.voter_result = selected.voter_result;
      update.final_registration_date = selected.final_registration_date;
    }

    const { error } = await supabase.from('students').update(update).eq('id', selected.id);
    setSaving(false);
    setMsg(error
      ? { type: 'err', text: error.message }
      : { type: 'ok', text: 'បានរក្សាទុកទិន្នន័យដោយជោគជ័យ' });
    if (!error) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Selection step
  if (!selected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="max-w-2xl mx-auto p-4 pb-20">
          <header className="text-center py-6 sm:py-10">
            <div className="inline-grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white mb-3">
              <GraduationCap size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">ទម្រង់ចុះបំពេញព័ត៌មានសិស្ស</h1>
            <p className="text-slate-500 text-sm sm:text-base mt-2">ជ្រើសថ្នាក់ ស្វែងរកឈ្មោះ បំពេញព័ត៌មាន</p>
          </header>

          <div className="card p-4 sm:p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">ប្រភេទទិន្នន័យ</label>
                <select className="input" value={module} onChange={e => setModule(e.target.value as ModuleType)}>
                  <option value="id_card">តាមដានអត្តសញ្ញាណប័ណ្ណ</option>
                  <option value="voter">តាមដានចុះឈ្មោះបោះឆ្នោត</option>
                </select>
              </div>
              <div>
                <label className="label">{classroomLocked ? 'ថ្នាក់' : 'ជ្រើសថ្នាក់'}</label>
                {classroomLocked ? (
                  <div className="input bg-blue-50 border-blue-200 font-semibold text-blue-900 flex items-center gap-2">
                    <GraduationCap size={18} />
                    {classroom}
                  </div>
                ) : (
                  <select className="input" value={classroom} onChange={e => setClassroom(e.target.value)}>
                    <option value="">-- ជ្រើសថ្នាក់ --</option>
                    {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            </div>

            {classroom && (
              <>
                <div>
                  <label className="label">ស្វែងរកឈ្មោះ ឬ លេខកូដ</label>
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-10"
                      placeholder="វាយឈ្មោះសិស្ស..."
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {module === 'voter' && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    បង្ហាញតែសិស្សដែលមានអាយុ {VOTER_MIN_AGE} ឆ្នាំឡើងតែប៉ុណ្ណោះ
                  </p>
                )}

                <div className="space-y-2 max-h-[55vh] overflow-y-auto -mx-1 px-1">
                  {loading ? (
                    <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
                  ) : filtered.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">
                      {q ? 'រកមិនឃើញ' : module === 'voter'
                        ? `គ្មានសិស្ស ${VOTER_MIN_AGE} ឆ្នាំឡើងក្នុងថ្នាក់នេះ`
                        : 'គ្មានសិស្ស'}
                    </p>
                  ) : filtered.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelected(s); setMsg(null); }}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.student_code} • {s.gender || '—'}</p>
                        </div>
                        {s.updated_by_student && (
                          <CheckCircle size={16} className="text-green-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="max-w-2xl mx-auto p-4 pb-32">
        <button
          type="button"
          className="btn-ghost mb-2 -ml-2"
          onClick={() => { setSelected(null); setMsg(null); }}
        >
          <ChevronLeft size={18} /> ត្រឡប់
        </button>

        {msg && (
          <div className={`mb-3 px-4 py-3 rounded-xl text-sm font-medium ${
            msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={submit} className="card p-4 sm:p-5 space-y-4">
          <h2 className="font-bold text-lg">បំពេញព័ត៌មាន — {selected.name}</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">ឈ្មោះសិស្ស</label>
              <input className="input" value={selected.name} onChange={e => setField('name', e.target.value)} required />
            </div>
            <div>
              <label className="label">ភេទ</label>
              <select className="input" value={selected.gender || ''} onChange={e => setField('gender', e.target.value)}>
                <option value="">--</option>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ថ្ងៃខែឆ្នាំកំណើត</label>
              <input type="date" className="input" value={selected.dob || ''} onChange={e => setField('dob', e.target.value || null)} />
            </div>
            <div>
              <label className="label">លេខអត្តសញ្ញាណប័ណ្ណ</label>
              <input className="input" value={selected.id_card_number || ''} onChange={e => setField('id_card_number', e.target.value || null)} inputMode="numeric" />
            </div>
            <div>
              <label className="label">លេខទូរស័ព្ទ</label>
              <input className="input" value={selected.phone || ''} onChange={e => setField('phone', e.target.value || null)} inputMode="tel" placeholder="012 345 678" />
            </div>
            {module === 'voter' && (
              <div className="sm:col-span-2">
                <label className="label">ថ្ងៃចុះឈ្មោះចុងក្រោយ</label>
                <input type="date" className="input" value={selected.final_registration_date || ''} onChange={e => setField('final_registration_date', e.target.value || null)} />
              </div>
            )}
          </div>

          <div>
            <label className="label font-semibold">អាសយដ្ឋានបច្ចុប្បន្ន</label>
            <AddressSelect value={selected} onChange={p => setSelected({ ...selected, ...p })} />
          </div>

          <div>
            <label className="label">លទ្ធផល / ស្ថានភាព</label>
            <select
              className="input"
              value={(module === 'id_card' ? selected.id_card_result : selected.voter_result) || ''}
              onChange={e => setField(module === 'id_card' ? 'id_card_result' : 'voter_result', e.target.value)}
            >
              {(module === 'id_card' ? ID_CARD_RESULTS : VOTER_RESULTS).map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
        </form>

        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-4">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => submit()}
              disabled={saving}
              className="btn-primary w-full text-base py-3"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
              រក្សាទុកព័ត៌មាន
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
