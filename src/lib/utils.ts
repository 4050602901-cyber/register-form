// Age as of `asOf` (defaults to today). Reports pass a reference date such
// as the final voter-registration deadline instead of the current date.
export function calculateAge(dob?: string | null, asOf?: Date): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const ref = asOf ?? new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

export function ageText(dob?: string | null): string {
  const age = calculateAge(dob);
  return age === null ? '' : `${age} ឆ្នាំ`;
}

export function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : '0%';
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('km-KH', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugify(s: string): string {
  return encodeURIComponent(s.trim());
}
