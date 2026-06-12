-- One-time cleanup: upgrade voter_result values saved with old wording to
-- the current option labels:
--   1. បានចុះឈ្មោះបោះឆ្នោត
--   2. មិនទាន់បានចុះឈ្មោះបោះឆ្នោត
--   3. មិនទាន់គ្រប់អាយុត្រូវចុះឈ្មោះ
-- Run this in the Supabase SQL Editor.

update public.students
set voter_result = 'បានចុះឈ្មោះបោះឆ្នោត'
where voter_result = 'បានចុះឈ្មោះរួច';

update public.students
set voter_result = 'មិនទាន់បានចុះឈ្មោះបោះឆ្នោត'
where voter_result in ('មិនទាន់បានចុះឈ្មោះ', 'មិនទាន់មានអត្តសញ្ញាណបណ្ណ');

update public.students
set voter_result = 'មិនទាន់គ្រប់អាយុត្រូវចុះឈ្មោះ'
where voter_result = 'មិនទាន់ដល់អាយុត្រូវចុះ';

-- Verify: should return only the three current labels (or null).
select voter_result, count(*) from public.students group by voter_result;
