import { useEffect, useState } from 'react';
import { Plus, Trash2, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ClassRow } from '../types';
import ClassQRCard from './ClassQRCard';

interface Props {
  onChange: () => void;
}

export default function ClassManager({ onChange }: Props) {
  const [name, setName] = useState('');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [qrFor, setQrFor] = useState<ClassRow | null>(null);

  async function load() {
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses(data || []);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from('classes').insert({ name: name.trim() });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setName('');
    await load();
    onChange();
  }

  async function remove(id: string, label: string) {
    if (!confirm(`លុបថ្នាក់ "${label}" និងសិស្សទាំងអស់ក្នុងថ្នាក់?`)) return;
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    await load();
    onChange();
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold text-lg mb-3">គ្រប់គ្រងថ្នាក់</h2>
      <div className="flex gap-2 mb-4">
        <input
          className="input"
          placeholder="ឧ. ថ្នាក់ទី១០ក"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button onClick={add} disabled={busy} className="btn-primary whitespace-nowrap">
          <Plus size={16} /> បង្កើត
        </button>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-slate-500">មិនទាន់មានថ្នាក់</p>
      ) : (
        <div className="space-y-2">
          {classes.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
              <span className="font-medium">{c.name}</span>
              <div className="flex gap-1">
                <button
                  className="btn-ghost text-blue-600"
                  onClick={() => setQrFor(c)}
                  title="បង្ហាញ QR Code"
                  aria-label="QR Code"
                >
                  <QrCode size={18} />
                </button>
                <button
                  className="btn-ghost text-red-600"
                  onClick={() => remove(c.id, c.name)}
                  title="លុបថ្នាក់"
                  aria-label="លុប"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrFor && <ClassQRCard cls={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}
