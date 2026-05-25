import { useEffect, useState } from 'react';
import { QrCode, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ClassQRCard from './ClassQRCard';

interface ClassroomStat {
  classroom: string;
  count: number;
}

export default function ClassroomList() {
  const [rows, setRows] = useState<ClassroomStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrFor, setQrFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('students').select('classroom').not('classroom', 'is', null);
      if (cancelled) return;
      const map = new Map<string, number>();
      (data || []).forEach((r: any) => {
        if (!r.classroom) return;
        map.set(r.classroom, (map.get(r.classroom) ?? 0) + 1);
      });
      const list: ClassroomStat[] = Array.from(map.entries())
        .map(([classroom, count]) => ({ classroom, count }))
        .sort((a, b) => a.classroom.localeCompare(b.classroom, 'km'));
      setRows(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">ថ្នាក់រៀន</h2>
        <span className="text-sm text-slate-500">{rows.length} ថ្នាក់</span>
      </div>

      {loading ? (
        <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">មិនទាន់មានទិន្នន័យសិស្ស</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {rows.map(r => (
            <div key={r.classroom} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.classroom}</p>
                <p className="text-xs text-slate-500">{r.count} នាក់</p>
              </div>
              <button
                className="btn-ghost text-blue-600 shrink-0"
                onClick={() => setQrFor(r.classroom)}
                title="បង្ហាញ QR Code"
                aria-label="QR"
              >
                <QrCode size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {qrFor && <ClassQRCard classroom={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}
