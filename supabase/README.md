# Supabase Setup

Run these SQL files **in order** inside the Supabase SQL Editor.

## 1. `migration.sql` (REQUIRED — run first)

Additive only — safe on a database that already has `students`, `profiles`, etc.

Creates:
- `provinces`, `districts`, `communes`, `villages` tables (empty)
- New columns on `students`: `phone`, `id_card_number`, `address`,
  `province_id`, `district_id`, `commune_id`, `village_id`, `id_card_result`,
  `voter_result`, `final_registration_date`, `updated_by_student`, `updated_at`
- Indexes, RLS policies, `touch_updated_at` trigger, `students_full` view

Re-running is safe — every statement uses `IF NOT EXISTS` / `IF EXISTS`.

## 2. `cambodia_address_full.sql` (run second)

Full Cambodia administrative gazetteer:

| Level | Rows |
|---|---|
| Provinces | 25 |
| Districts | 197 |
| Communes | 1,646 |
| Villages | 14,372 |

Source: [RathanakSreang/cambodia-gazetteer](https://github.com/RathanakSreang/cambodia-gazetteer).

Idempotent — `on conflict (id) do update set name_km = excluded.name_km`.

> **Note:** The file is ~1.1 MB. If the Supabase SQL editor times out, split it
> into chunks (each `insert` statement is independent and ends with `;`).
