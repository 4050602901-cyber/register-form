import { useEffect, useMemo, useState } from 'react';
import { Download, X, Loader2, Search } from 'lucide-react';
import { ModuleType, StudentRow } from '../types';
import { exportStudentsExcel } from '../lib/excelExport';

interface Props {
  module: ModuleType;
  classrooms: string[];
  students: StudentRow[];
  initialClassroom?: string;
  onClose: () => void;
}

/**
 * Modal that forces the admin to pick at least one classroom before exporting.
 * Builds one workbook with a Total sheet + per-classroom sheets matching the
 * official ministry templates.
 */
export default function ExportPicker({
  module, classrooms, students, initialClassroom, onClose
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() =>
    initialClassroom ? new Set([initialClassroom]) : new Set(classrooms)
  );
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(initialClassroom ? new Set([initialClassroom]) : new Set(classrooms));
  }, [classrooms, initialClassroom]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? classrooms.filter(c => c.toLowerCase().includes(term)) : classrooms;
  }, [classrooms, q]);

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c));

  function toggle(c: string) {
    const next = new Set(selected);
    if (next.has(c)) next.delete(c); else next.add(c);
    setSelected(next);
  }

  function toggleVisible() {
    const next = new Set(selected);
    if (allSelected) filtered.forEach(c => next.delete(c));
    else filtered.forEach(c => next.add(c));
    setSelected(next);
  }

  async function doExport() {
    if (selected.size === 0) {
      alert('សូមជ្រើសថ្នាក់យ៉ាងហោចណាស់មួយ');
      return;
    }
    setBusy(true);
    try {
      const orderedClassrooms = classrooms.filter(c => selected.has(c));
      const filteredStudents = students.filter(s =>
        s.classroom != null && selected.has(s.classroom)
      );
      exportStudentsExcel(filteredStudents, module, orderedClassrooms);
      onClose();
    } catch (e: any) {
      alert(`បរាជ័យ: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const moduleLabel = module === 'voter'
    ? 'ការចុះឈ្មោះបោះឆ្នោត'
    : 'អត្តសញ្ញាណប័ណ្ណ';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="card p-5 max-w-md w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-bold text-lg">ជ្រើសថ្នាក់សម្រាប់ Export</h2>
            <p className="text-sm text-slate-500">{moduleLabel}</p>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="បិទ"><X size={20} /></button>
        </div>

        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="ស្វែងរកថ្នាក់..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleVisible}
            className="w-4 h-4"
          />
          <span className="font-medium">
            {q ? `ជ្រើសទាំងអស់ដែលឃើញ (${filtered.length})` : `ជ្រើសទាំងអស់ (${classrooms.length})`}
          </span>
        </label>

        <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-sm">រកមិនឃើញថ្នាក់</p>
          ) : filtered.map(c => (
            <label
              key={c}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(c)}
                onChange={() => toggle(c)}
                className="w-4 h-4"
              />
              <span>{c}</span>
            </label>
          ))}
        </div>

        <p className="text-xs text-slate-500 pt-3 border-t border-slate-100 mt-3">
          ឯកសារនឹងមាន: <strong>Total</strong> sheet + មួយ sheet ក្នុងថ្នាក់នីមួយៗ
        </p>

        <div className="flex gap-2 pt-3">
          <button type="button" className="btn-soft flex-1" onClick={onClose}>បោះបង់</button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={doExport}
            disabled={busy || selected.size === 0}
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            Export ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
