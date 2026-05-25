export function calculateAge(dob?: string | null) {
  if (!dob) return null;
  const birth = new Date(dob); if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
export function ageText(dob?: string | null) {
  const age = calculateAge(dob); return age === null ? '' : `${age} ឆ្នាំ`;
}
export function pct(n:number,d:number){ return d ? `${Math.round((n/d)*100)}%` : '0%'; }
