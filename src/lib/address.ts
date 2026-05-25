import { StudentRow } from '../types';

export function formatKhmerAddress(s: Partial<StudentRow>): string {
  const parts = [
    s.villages?.name_km && `ភូមិ${s.villages.name_km}`,
    s.communes?.name_km && `ឃុំ/សង្កាត់${s.communes.name_km}`,
    s.districts?.name_km && `ស្រុក/ខណ្ឌ${s.districts.name_km}`,
    s.provinces?.name_km && `ខេត្ត/រាជធានី${s.provinces.name_km}`
  ].filter(Boolean) as string[];
  const tail = parts.join(' ');
  return s.address ? (tail ? `${s.address}, ${tail}` : s.address) : tail;
}

export function shortAddress(s: Partial<StudentRow>): string {
  const parts = [
    s.villages?.name_km,
    s.communes?.name_km,
    s.districts?.name_km,
    s.provinces?.name_km
  ].filter(Boolean) as string[];
  return parts.join(', ');
}
