-- One-time cleanup: upgrade voter_result values saved with the old wording
-- (before the options were renamed) to the current option labels.
-- Run this in the Supabase SQL Editor.

update public.students
set voter_result = 'បានចុះឈ្មោះបោះឆ្នោត'
where voter_result = 'បានចុះឈ្មោះរួច';

update public.students
set voter_result = 'មិនទាន់បានចុះឈ្មោះបោះឆ្នោត'
where voter_result in ('មិនទាន់បានចុះឈ្មោះ', 'មិនទាន់ដល់អាយុត្រូវចុះ');

-- Verify: should return only the three current labels (or null).
select voter_result, count(*) from public.students group by voter_result;
