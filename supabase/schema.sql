create extension if not exists "pgcrypto";

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

create type public.tracking_module as enum ('id_card','voter');
create type public.gender_type as enum ('ប្រុស','ស្រី');

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  no int,
  student_name text not null,
  gender gender_type,
  date_of_birth date,
  id_card_number text,
  address text,
  real_status text,
  id_card_result text default 'មិនទាន់បានធ្វើ',
  voter_result text default 'មិនទាន់បានចុះឈ្មោះ',
  final_registration_date date,
  updated_by_student boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(class_id, student_name)
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger students_touch_updated_at
before update on public.students
for each row execute function public.touch_updated_at();

alter table public.classes enable row level security;
alter table public.students enable row level security;

-- Admins: any authenticated teacher can manage all data.
create policy "admins manage classes" on public.classes
for all to authenticated using (true) with check (true);
create policy "admins manage students" on public.students
for all to authenticated using (true) with check (true);

-- Students/public form: read classes/students and update limited records.
create policy "public read classes" on public.classes
for select to anon using (true);
create policy "public read students" on public.students
for select to anon using (true);
create policy "public update own selected student" on public.students
for update to anon using (true)
with check (true);


-- Cambodia administrative boundaries for address dropdowns
create table if not exists public.provinces (
  id text primary key,
  code text unique not null,
  name_km text not null,
  name_en text
);

create table if not exists public.districts (
  id text primary key,
  province_id text not null references public.provinces(id) on delete cascade,
  code text unique not null,
  name_km text not null,
  name_en text
);

create table if not exists public.communes (
  id text primary key,
  province_id text not null references public.provinces(id) on delete cascade,
  district_id text not null references public.districts(id) on delete cascade,
  code text unique not null,
  name_km text not null,
  name_en text
);

create table if not exists public.villages (
  id text primary key,
  province_id text not null references public.provinces(id) on delete cascade,
  district_id text not null references public.districts(id) on delete cascade,
  commune_id text not null references public.communes(id) on delete cascade,
  code text unique not null,
  name_km text not null,
  name_en text
);

alter table public.students
  add column if not exists province_id text references public.provinces(id),
  add column if not exists district_id text references public.districts(id),
  add column if not exists commune_id text references public.communes(id),
  add column if not exists village_id text references public.villages(id);

create index if not exists districts_province_id_idx on public.districts(province_id);
create index if not exists communes_district_id_idx on public.communes(district_id);
create index if not exists villages_commune_id_idx on public.villages(commune_id);

alter table public.provinces enable row level security;
alter table public.districts enable row level security;
alter table public.communes enable row level security;
alter table public.villages enable row level security;

create policy "public read provinces" on public.provinces for select to anon, authenticated using (true);
create policy "public read districts" on public.districts for select to anon, authenticated using (true);
create policy "public read communes" on public.communes for select to anon, authenticated using (true);
create policy "public read villages" on public.villages for select to anon, authenticated using (true);
create policy "admins manage provinces" on public.provinces for all to authenticated using (true) with check (true);
create policy "admins manage districts" on public.districts for all to authenticated using (true) with check (true);
create policy "admins manage communes" on public.communes for all to authenticated using (true) with check (true);
create policy "admins manage villages" on public.villages for all to authenticated using (true) with check (true);
