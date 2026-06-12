export type ModuleType = 'id_card' | 'voter';

export interface AddressRow {
  id: string;
  code: string;
  name_km: string;
  name_en?: string | null;
  province_id?: string;
  district_id?: string;
  commune_id?: string;
}

/**
 * Mirrors the `public.students` table (existing schema):
 *   id, student_code, name, gender, dob, classroom, created_at, status
 * Plus columns added by migration.sql:
 *   phone, id_card_number, address, province_id, district_id, commune_id, village_id,
 *   real_status, id_card_result, voter_result, final_registration_date,
 *   updated_by_student, updated_at
 */
export interface StudentRow {
  id: string;
  student_code: string;
  name: string;
  gender: string;
  dob?: string | null;
  classroom: string;
  status?: string | null;
  created_at?: string | null;

  // Registration extension
  phone?: string | null;
  id_card_number?: string | null;
  address?: string | null;
  province_id?: string | null;
  district_id?: string | null;
  commune_id?: string | null;
  village_id?: string | null;
  real_status?: string | null;
  id_card_result?: string | null;
  voter_result?: string | null;
  final_registration_date?: string | null;
  updated_by_student?: boolean | null;
  updated_at?: string | null;

  // Joined relations
  provinces?: AddressRow | null;
  districts?: AddressRow | null;
  communes?: AddressRow | null;
  villages?: AddressRow | null;
}

export const ID_CARD_RESULTS = [
  'បានធ្វើរួច',
  'មិនទាន់បានធ្វើ',
  'មិនទាន់ដល់អាយុត្រូវធ្វើ'
] as const;

export const VOTER_RESULTS = [
  'បានចុះឈ្មោះបោះឆ្នោត',
  'មិនទាន់បានចុះឈ្មោះបោះឆ្នោត',
  'មិនទាន់មានអត្តសញ្ញាណបណ្ណ'
] as const;

// Wording saved by older versions of the app (before VOTER_RESULTS was
// renamed). Rows with these values still exist in the database, so every
// display / filter / count must normalize through this map first.
const LEGACY_VOTER_RESULT_MAP: Record<string, string> = {
  'បានចុះឈ្មោះរួច': 'បានចុះឈ្មោះបោះឆ្នោត',
  'មិនទាន់បានចុះឈ្មោះ': 'មិនទាន់បានចុះឈ្មោះបោះឆ្នោត',
  'មិនទាន់ដល់អាយុត្រូវចុះ': 'មិនទាន់បានចុះឈ្មោះបោះឆ្នោត'
};

export function normalizeVoterResult(value?: string | null): string | null {
  if (!value) return value ?? null;
  return LEGACY_VOTER_RESULT_MAP[value.trim()] ?? value;
}

export const VOTER_MIN_AGE = 18;

export const GENDERS = ['ប្រុស', 'ស្រី'] as const;
