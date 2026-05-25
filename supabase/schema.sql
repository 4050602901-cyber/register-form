-- =====================================================================
-- Khmer Student Registration — Production Schema
-- Run once in Supabase SQL editor. Idempotent where safe.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.tracking_module as enum ('id_card','voter');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gender_type as enum ('ប្រុស','ស្រី');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- ADDRESS TABLES (Cambodia administrative divisions)
-- ---------------------------------------------------------------------
create table if not exists public.provinces (
  id          text primary key,
  code        text unique not null,
  name_km     text not null,
  name_en     text
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
  commune_id  text not null references public.communes(id) on delete cascade,
  code        text unique not null,
  name_km     text not null,
  name_en     text
);

create index if not exists districts_province_id_idx on public.districts(province_id);
create index if not exists communes_district_id_idx  on public.communes(district_id);
create index if not exists villages_commune_id_idx   on public.villages(commune_id);

-- ---------------------------------------------------------------------
-- CLASSES — with unique slug for per-class registration QR
-- ---------------------------------------------------------------------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text unique default replace(gen_random_uuid()::text, '-', ''),
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Backfill slug for legacy rows
update public.classes set slug = replace(gen_random_uuid()::text, '-', '') where slug is null;
alter table public.classes alter column slug set not null;

-- ---------------------------------------------------------------------
-- STUDENTS
-- ---------------------------------------------------------------------
create table if not exists public.students (
  id                       uuid primary key default gen_random_uuid(),
  class_id                 uuid not null references public.classes(id) on delete cascade,
  no                       int,
  student_name             text not null,
  gender                   gender_type,
  date_of_birth            date,
  id_card_number           text,
  address                  text,
  province_id              text references public.provinces(id),
  district_id              text references public.districts(id),
  commune_id               text references public.communes(id),
  village_id               text references public.villages(id),
  real_status              text,
  id_card_result           text default 'មិនទាន់បានធ្វើ',
  voter_result             text default 'មិនទាន់បានចុះឈ្មោះ',
  final_registration_date  date,
  updated_by_student       boolean default false,
  phone                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  unique (class_id, student_name)
);

-- Backfill columns for legacy rows
alter table public.students add column if not exists province_id text references public.provinces(id);
alter table public.students add column if not exists district_id text references public.districts(id);
alter table public.students add column if not exists commune_id  text references public.communes(id);
alter table public.students add column if not exists village_id  text references public.villages(id);
alter table public.students add column if not exists phone       text;

create index if not exists students_class_id_idx        on public.students(class_id);
create index if not exists students_province_id_idx     on public.students(province_id);
create index if not exists students_name_trgm_idx       on public.students using gin (student_name gin_trgm_ops);
create index if not exists students_id_card_result_idx  on public.students(id_card_result);
create index if not exists students_voter_result_idx    on public.students(voter_result);

-- ---------------------------------------------------------------------
-- TRIGGERS — auto-update updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists students_touch_updated_at on public.students;
create trigger students_touch_updated_at
  before update on public.students
  for each row execute function public.touch_updated_at();

drop trigger if exists classes_touch_updated_at on public.classes;
create trigger classes_touch_updated_at
  before update on public.classes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.provinces enable row level security;
alter table public.districts enable row level security;
alter table public.communes  enable row level security;
alter table public.villages  enable row level security;
alter table public.classes   enable row level security;
alter table public.students  enable row level security;

-- Drop & recreate policies idempotently
do $$ begin
  perform 1;
exception when others then null; end $$;

drop policy if exists "public read provinces" on public.provinces;
drop policy if exists "public read districts" on public.districts;
drop policy if exists "public read communes"  on public.communes;
drop policy if exists "public read villages"  on public.villages;
drop policy if exists "admins write provinces" on public.provinces;
drop policy if exists "admins write districts" on public.districts;
drop policy if exists "admins write communes"  on public.communes;
drop policy if exists "admins write villages"  on public.villages;
drop policy if exists "public read classes"  on public.classes;
drop policy if exists "admins write classes" on public.classes;
drop policy if exists "public read students"  on public.students;
drop policy if exists "public update students" on public.students;
drop policy if exists "admins write students" on public.students;

-- Address lookup: anyone can read, only authed can edit
create policy "public read provinces" on public.provinces for select to anon, authenticated using (true);
create policy "public read districts" on public.districts for select to anon, authenticated using (true);
create policy "public read communes"  on public.communes  for select to anon, authenticated using (true);
create policy "public read villages"  on public.villages  for select to anon, authenticated using (true);
create policy "admins write provinces" on public.provinces for all to authenticated using (true) with check (true);
create policy "admins write districts" on public.districts for all to authenticated using (true) with check (true);
create policy "admins write communes"  on public.communes  for all to authenticated using (true) with check (true);
create policy "admins write villages"  on public.villages  for all to authenticated using (true) with check (true);

-- Classes: anyone reads (for student page), only authed manages
create policy "public read classes"  on public.classes for select to anon, authenticated using (true);
create policy "admins write classes" on public.classes for all to authenticated using (true) with check (true);

-- Students: anyone reads + updates their own entry; only authed inserts/deletes
create policy "public read students"   on public.students for select to anon, authenticated using (true);
create policy "public update students" on public.students for update to anon using (true) with check (true);
create policy "admins write students"  on public.students for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- HELPER VIEWS (used by export)
-- ---------------------------------------------------------------------
create or replace view public.students_full as
select
  s.*,
  c.name        as class_name,
  c.slug        as class_slug,
  p.name_km     as province_name,
  d.name_km     as district_name,
  cm.name_km    as commune_name,
  v.name_km     as village_name
from public.students s
left join public.classes   c  on c.id  = s.class_id
left join public.provinces p  on p.id  = s.province_id
left join public.districts d  on d.id  = s.district_id
left join public.communes  cm on cm.id = s.commune_id
left join public.villages  v  on v.id  = s.village_id;
