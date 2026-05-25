export type ModuleType = 'id_card' | 'voter';
export type Gender = 'ប្រុស' | 'ស្រី';

export interface AddressRow { id: string; code: string; name_km: string; name_en?: string | null; province_id?: string; district_id?: string; commune_id?: string; }

export interface ClassRow { id: string; name: string; description?: string | null; created_at?: string; }
export interface StudentRow {
  id: string; class_id: string; no?: number | null; student_name: string; gender?: Gender | null;
  date_of_birth?: string | null; id_card_number?: string | null; address?: string | null;
  real_status?: string | null; id_card_result?: string | null; voter_result?: string | null;
  final_registration_date?: string | null; updated_by_student?: boolean | null; updated_at?: string | null;
  province_id?: string | null; district_id?: string | null; commune_id?: string | null; village_id?: string | null;
  provinces?: AddressRow; districts?: AddressRow; communes?: AddressRow; villages?: AddressRow;
  classes?: ClassRow;
}

export const ID_CARD_RESULTS = ['បានធ្វើរួច','មិនទាន់បានធ្វើ','មិនទាន់ដល់អាយុត្រូវធ្វើ'] as const;
export const VOTER_RESULTS = ['បានចុះឈ្មោះរួច','មិនទាន់បានចុះឈ្មោះ','មិនទាន់ដល់អាយុត្រូវចុះ'] as const;
