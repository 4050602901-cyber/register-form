# Supabase Setup

Run these SQL files **in order** inside the Supabase SQL Editor.

## 1. `migration.sql` (REQUIRED — run first)

Additive only — safe to run on a database that already has `students`, `profiles`, etc.

What it does:
- Creates `provinces`, `districts`, `communes`, `villages` tables
- Adds new columns to `students` (`phone`, `id_card_number`, `address`,
  `province_id`, `district_id`, `commune_id`, `village_id`, `id_card_result`,
  `voter_result`, `final_registration_date`, `updated_by_student`, `updated_at`)
- Adds indexes on `classroom`, `id_card_result`, `voter_result`, etc.
- Sets up RLS policies (public read, anon update for self-service form)
- Creates `touch_updated_at` trigger
- Creates `students_full` view (joined for export)

What it does **not** touch:
- Existing rows in `students`
- Existing columns (`id`, `student_code`, `name`, `gender`, `dob`, `classroom`,
  `status`, `created_at`)
- Other tables (`profiles`, `attendance`, `homework_records`, `subjects`,
  `teacher_attendance`)

Re-running it is safe — every statement uses `IF NOT EXISTS` / `IF EXISTS`.

## 2. `address_seed_sample.sql` (run second)

Inserts 25 Cambodian provinces and a small sample of districts/communes/villages
for Phnom Penh. Replace with the full NCDD gazetteer when you have it.

`on conflict (id) do update` makes this safe to re-run.
