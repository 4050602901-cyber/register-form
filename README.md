# Khmer Student Registration WebApp

React + TypeScript + TailwindCSS + Supabase + XLSX.

## Setup
1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/schema.sql`.
3. Create an admin user in Supabase Authentication.
4. Copy `.env.example` to `.env` and fill values.
5. Run:
```bash
npm install
npm run dev
```

## Pages
- `/` Admin dashboard
- `/student` Simple student form with class/name search

## Excel
Import supports automatic Khmer/English column mapping. Export creates Total sheet and separate sheets per class.


## Cambodia Address Dropdown
Run `supabase/address_seed_sample.sql` after `schema.sql` to enable province/district/commune/village dropdowns. The included seed has all 25 provinces and a small Phnom Penh sample hierarchy.

For complete village-level data, import a full Cambodia gazetteer dataset from NCDD-based sources, then map fields into `provinces`, `districts`, `communes`, and `villages`.
Recommended source structure: code, Khmer name, English name, parent id.
