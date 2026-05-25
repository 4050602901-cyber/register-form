import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, X } from 'lucide-react';
import { downloadBlob, slugify } from '../lib/utils';

interface Props {
  classroom: string;
  onClose: () => void;
}

export default function ClassQRCard({ classroom, onClose }: Props) {
  const svgRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/student?class=${slugify(classroom)}`;

  function downloadSvg() {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `qr-${classroom.replace(/\s+/g, '-')}.svg`);
  }

  function printQR() {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    const svg = svgRef.current?.querySelector('svg')?.outerHTML || '';
    w.document.write(`
      <!doctype html><html><head><title>QR — ${classroom}</title>
      <style>
        body{font-family:'Kantumruy Pro',sans-serif;text-align:center;padding:40px}
        h1{margin:0 0 8px;font-size:32px}
        p{color:#475569;margin:0 0 24px}
        .qr{display:inline-block;padding:20px;border:2px solid #e2e8f0;border-radius:16px;background:white}
        .url{margin-top:16px;font-size:12px;color:#64748b;word-break:break-all;max-width:400px;margin-left:auto;margin-right:auto}
      </style></head><body>
        <h1>ថ្នាក់ ${classroom}</h1>
        <p>ស្កេនដើម្បីបំពេញព័ត៌មានសិស្ស</p>
        <div class="qr">${svg}</div>
        <div class="url">${url}</div>
        <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">ថ្នាក់ {classroom}</h3>
            <p className="text-sm text-slate-500">QR Code សម្រាប់ថ្នាក់</p>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="បិទ"><X size={20} /></button>
        </div>
        <div ref={svgRef} className="grid place-items-center p-4 bg-slate-50 rounded-2xl mb-4">
          <QRCodeSVG value={url} size={220} level="M" includeMargin />
        </div>
        <p className="text-xs text-slate-500 break-all mb-4 text-center">{url}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-soft" onClick={downloadSvg}><Download size={16} /> SVG</button>
          <button className="btn-primary" onClick={printQR}><Printer size={16} /> បោះពុម្ព</button>
        </div>
      </div>
    </div>
  );
}
