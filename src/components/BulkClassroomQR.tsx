import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/fetchAll';
import { calculateAge, slugify } from '../lib/utils';

interface AgeBucket {
  age: number | null;
  count: number;
}

interface ClassSummary {
  classroom: string;
  total: number;
  female: number;
  male: number;
  ageGroups: AgeBucket[];
}

/**
 * Loads every (classroom, dob, gender) row, aggregates per classroom,
 * renders a hidden React subtree of QR + summary tables, then opens a
 * print window that paginates one classroom per page.
 */
export default function BulkClassroomQR() {
  const [items, setItems] = useState<ClassSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function prepare() {
    if (busy) return;
    setBusy(true);
    try {
      const rows = await fetchAll<{ classroom: string | null; dob: string | null; gender: string | null }>(
        ([from, to]) => supabase
          .from('students')
          .select('classroom, dob, gender')
          .not('classroom', 'is', null)
          .range(from, to)
      );

      const byClass = new Map<string, { total: number; female: number; male: number; ages: Map<number | null, number> }>();
      for (const r of rows) {
        if (!r.classroom) continue;
        let g = byClass.get(r.classroom);
        if (!g) { g = { total: 0, female: 0, male: 0, ages: new Map() }; byClass.set(r.classroom, g); }
        g.total++;
        if (r.gender === 'ស្រី') g.female++;
        else if (r.gender === 'ប្រុស') g.male++;
        const age = calculateAge(r.dob);
        g.ages.set(age, (g.ages.get(age) ?? 0) + 1);
      }

      const summaries: ClassSummary[] = Array.from(byClass.entries())
        .map(([classroom, g]) => ({
          classroom,
          total: g.total,
          female: g.female,
          male: g.male,
          ageGroups: Array.from(g.ages.entries())
            .map(([age, count]) => ({ age, count }))
            .sort((a, b) => {
              if (a.age === null) return 1;
              if (b.age === null) return -1;
              return a.age - b.age;
            })
        }))
        .sort((a, b) => a.classroom.localeCompare(b.classroom, 'km'));

      setItems(summaries);
    } catch (e: any) {
      alert(`បរាជ័យ: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  // After items render in the hidden container, build a print window
  useEffect(() => {
    if (!items || !ref.current) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      const html = ref.current?.innerHTML || '';
      const w = window.open('', '_blank', 'width=900,height=1200');
      if (!w) { setItems(null); return; }
      w.document.write(`
<!doctype html><html lang="km"><head>
<meta charset="utf-8" />
<title>QR ថ្នាក់ទាំងអស់</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{font-family:'Kantumruy Pro',sans-serif;margin:0;color:#0f172a}
  .qr-page{
    page-break-after:always;
    min-height:100vh;
    padding:24mm 18mm;
    display:flex;flex-direction:column;align-items:center;gap:14px;
  }
  .qr-page:last-child{page-break-after:auto}
  h1{font-size:30px;margin:0}
  .meta{color:#475569;font-size:14px;margin:0;text-align:center}
  .meta strong{color:#0f172a}
  .qr{padding:14px;border:2px solid #e2e8f0;border-radius:14px;background:white}
  .url{font-size:11px;color:#64748b;word-break:break-all;max-width:340px;text-align:center;margin:0}
  table{border-collapse:collapse;margin-top:8px;min-width:300px}
  th,td{border:1px solid #cbd5e1;padding:6px 14px;font-size:14px}
  th{background:#f1f5f9;text-align:left}
  td.num,th.num{text-align:right}
  tfoot td{font-weight:bold;background:#f8fafc}
  @media print{
    body{margin:0}
    .qr-page{padding:18mm 14mm}
  }
</style></head><body>
${html}
<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
</body></html>`);
      w.document.close();
      setTimeout(() => setItems(null), 500);
    }));
    return () => cancelAnimationFrame(id);
  }, [items]);

  return (
    <>
      <button
        type="button"
        className="btn-soft text-sm"
        onClick={prepare}
        disabled={busy}
        title="បោះពុម្ព QR Code គ្រប់ថ្នាក់"
      >
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
        QR ទាំងអស់
      </button>

      {/* Hidden render — used as the source for the print window */}
      {items && (
        <div
          ref={ref}
          aria-hidden
          style={{ position: 'fixed', left: '-10000px', top: 0, width: '600px', pointerEvents: 'none' }}
        >
          {items.map(item => {
            const url = `${window.location.origin}/student?class=${slugify(item.classroom)}`;
            return (
              <div key={item.classroom} className="qr-page">
                <h1>ថ្នាក់ {item.classroom}</h1>
                <p className="meta">
                  សរុបសិស្ស: <strong>{item.total}</strong> នាក់ — ប្រុស: <strong>{item.male}</strong> · ស្រី: <strong>{item.female}</strong>
                </p>
                <div className="qr">
                  <QRCodeSVG value={url} size={220} level="M" includeMargin />
                </div>
                <p className="url">{url}</p>
                <table>
                  <thead>
                    <tr>
                      <th>ក្រុមអាយុ</th>
                      <th className="num">ចំនួន</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.ageGroups.map(g => (
                      <tr key={g.age ?? 'na'}>
                        <td>{g.age !== null ? `${g.age} ឆ្នាំ` : 'មិនបានបញ្ជាក់ថ្ងៃកំណើត'}</td>
                        <td className="num">{g.count} នាក់</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>សរុប</td>
                      <td className="num">{item.total} នាក់</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
