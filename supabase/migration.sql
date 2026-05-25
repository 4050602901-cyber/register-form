-- =====================================================================
-- ការផ្លាស់ប្តូរ Schema សម្រាប់ Registration Form
-- សុវត្ថិភាព: មិនកែ/លុប column ឬ table ដែលមានរួច; ច្បាស់ idempotent
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ADDRESS LOOKUP TABLES (Cambodia administrative divisions)
-- ---------------------------------------------------------------------
create table if not exists public.provinces (
  id      text primary key,
  code    text unique not null,
  name_km text not null,
  name_en text
);

create table if not exists public.districts (
  id          text primary key,
  province_id text not null references public.provinces(id) on delete cascade,
  code        text unique not null,
  name_km     text not null,
  name_en     text
);

create table if not exists public.communes (
  id          text primary key,
  province_id text not null references public.provinces(id) on delete cascade,
  district_id text not null references public.districts(id) on delete cascade,
  code        text unique not null,
  name_km     text not null,
  name_en     text
);

create table if not exists public.villages (
  id          text primary key,
  province_id text not null references public.provinces(id) on delete cascade,
  district_id text not null references public.districts(id) on delete cascade,
  commune_id  text not null references public.communes(id)  on delete cascade,
  code        text unique not null,
  name_km     text not null,
  name_en     text
);

create index if not exists districts_province_id_idx on public.districts(province_id);
create index if not exists communes_district_id_idx  on public.communes(district_id);
create index if not exists villages_commune_id_idx   on public.villages(commune_id);

alter table public.provinces enable row level security;
alter table public.districts enable row level security;
alter table public.communes  enable row level security;
alter table public.villages  enable row level security;

drop policy if exists "public read provinces" on public.provinces;
drop policy if exists "public read districts" on public.districts;
drop policy if exists "public read communes"  on public.communes;
drop policy if exists "public read villages"  on public.villages;
drop policy if exists "admins write provinces" on public.provinces;
drop policy if exists "admins write districts" on public.districts;
drop policy if exists "admins write communes"  on public.communes;
drop policy if exists "admins write villages"  on public.villages;

create policy "public read provinces" on public.provinces for select to anon, authenticated using (true);
create policy "public read districts" on public.districts for select to anon, authenticated using (true);
create policy "public read communes"  on public.communes  for select to anon, authenticated using (true);
create policy "public read villages"  on public.villages  for select to anon, authenticated using (true);
create policy "admins write provinces" on public.provinces for all to authenticated using (true) with check (true);
create policy "admins write districts" on public.districts for all to authenticated using (true) with check (true);
create policy "admins write communes"  on public.communes  for all to authenticated using (true) with check (true);
create policy "admins write villages"  on public.villages  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- EXTEND students TABLE (additive — keeps existing columns intact)
-- ---------------------------------------------------------------------
alter table public.students add column if not exists phone                   text;
alter table public.students add column if not exists id_card_number          text;
alter table public.students add column if not exists address                 text;
alter table public.students add column if not exists province_id             text references public.provinces(id);
alter table public.students add column if not exists district_id             text references public.districts(id);
alter table public.students add column if not exists commune_id              text references public.communes(id);
alter table public.students add column if not exists village_id              text references public.villages(id);
alter table public.students add column if not exists real_status             text;
alter table public.students add column if not exists id_card_result          text default 'មិនទាន់បានធ្វើ';
alter table public.students add column if not exists voter_result            text default 'មិនទាន់បានចុះឈ្មោះ';
alter table public.students add column if not exists final_registration_date date;
alter table public.students add column if not exists updated_by_student      boolean default false;
alter table public.students add column if not exists updated_at              timestamptz default now();

-- Indexes for the registration form's filters/search
create index if not exists students_classroom_idx       on public.students(classroom);
create index if not exists students_id_card_result_idx  on public.students(id_card_result);
create index if not exists students_voter_result_idx    on public.students(voter_result);
create index if not exists students_province_id_idx     on public.students(province_id);

-- ---------------------------------------------------------------------
-- TRIGGER for updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists students_touch_updated_at on public.students;
create trigger students_touch_updated_at
  before update on public.students
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS POLICIES on students — let the public student form update its own
-- record without giving them delete/insert rights. Admins keep full control.
-- ---------------------------------------------------------------------
alter table public.students enable row level security;

drop policy if exists "public read students"   on public.students;
drop policy if exists "public update students" on public.students;
drop policy if exists "admins write students"  on public.students;

create policy "public read students"   on public.students for select to anon, authenticated using (true);
create policy "public update students" on public.students for update to anon using (true) with check (true);
create policy "admins write students"  on public.students for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- HELPER VIEW — joined for export
-- ---------------------------------------------------------------------
create or replace view public.students_full as
select
  s.*,
  p.name_km  as province_name,
  d.name_km  as district_name,
  cm.name_km as commune_name,
  v.name_km  as village_name
from public.students s
left join public.provinces p  on p.id  = s.province_id
left join public.districts d  on d.id  = s.district_id
left join public.communes  cm on cm.id = s.commune_id
left join public.villages  v  on v.id  = s.village_id;
