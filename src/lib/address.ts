import { StudentRow } from '../types';

export function formatKhmerAddress(s: Partial<StudentRow>) {
  const parts = [s.villages?.name_km, s.communes?.name_km, s.districts?.name_km, s.provinces?.name_km].filter(Boolean);
  return parts.length ? parts.join(', ') : (s.address || '');
}
