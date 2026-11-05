-- =============================================================================
-- Client request (Nov 5): authorized ground equipment. Maintenance personnel
-- are authorized to operate specific ground support equipment (GPUs, tugs,
-- carts, ...) after a seminar, so the profile keeps which equipment a person
-- may operate and the date of the seminar.
--
--   equipment_types           fixed lookup, like ranks / aircraft_types
--   equipment_authorizations  one row per (person, equipment) + seminar date
--
-- Who sees and changes them follows the same rules as aircraft
-- qualifications. Idempotent: safe to run twice.
-- =============================================================================

create table if not exists public.equipment_types (
  code       text primary key,
  label      text not null,
  sort_order int not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.equipment_types enable row level security;
drop policy if exists equipment_types_select_scoped on public.equipment_types;
create policy equipment_types_select_scoped on public.equipment_types for select using (public.has_staff_access());

insert into public.equipment_types (code, label, sort_order) values
  ('itw_gse_4400_gpu',     'ITW GSE 4400 GPU',                          10),
  ('hobart_gpu_new',       'Hobart GPU (New)',                          20),
  ('hobart_gpu_old',       'Hobart GPU (Old)',                          30),
  ('hobart_rectifier',     'Hobart Rectifier',                          40),
  ('rectifier_28v',        'Rectifier 28V',                             50),
  ('scissor_manlift',      'Scissor Manlift',                           60),
  ('tronair_ground_aircon','Tronair Ground Aircon',                     70),
  ('nitrogen_cart',        'Nitrogen Cart',                             80),
  ('oxygen_cart',          'Oxygen Cart',                               90),
  ('potable_water_cart',   'A/C Potable Water Cart',                   100),
  ('tire_inflator_nitrofill','Tire Inflator Machine / Nitrofill Machine', 110),
  ('overhead_crane',       'Overhead Crane',                           120),
  ('tronair_towbarless_tug','Tronair Tow-Barless Electronic Tug',      130),
  ('curtis_medium',        'Curtis Medium',                            140),
  ('nmc_wollard_tow_truck','NMC Wollard Tow Truck',                    150),
  ('eagle_tug',            'Eagle Tug',                                160),
  ('tronair_hydraulic_mule','Tronair Hydraulic Mule',                  170)
on conflict (code) do nothing;

create table if not exists public.equipment_authorizations (
  id             uuid primary key default gen_random_uuid(),
  pilot_id       uuid not null references public.pilots(id) on delete cascade,
  equipment_code text not null references public.equipment_types(code),
  seminar_date   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  updated_by     uuid references auth.users(id) on delete set null,
  unique (pilot_id, equipment_code)
);

create index if not exists equipment_authorizations_pilot_id_idx on public.equipment_authorizations(pilot_id);

drop trigger if exists equipment_authorizations_set_updated_at on public.equipment_authorizations;
create trigger equipment_authorizations_set_updated_at
  before update on public.equipment_authorizations
  for each row execute function public.set_updated_at();

-- Same audit trail as the other safety records (who authorized what, and when).
drop trigger if exists equipment_authorizations_audit on public.equipment_authorizations;
create trigger equipment_authorizations_audit
  after insert or update or delete on public.equipment_authorizations
  for each row execute function public.audit_log_row_changes();

alter table public.equipment_authorizations enable row level security;

drop policy if exists equipment_authorizations_select_scoped on public.equipment_authorizations;
drop policy if exists equipment_authorizations_insert_scoped on public.equipment_authorizations;
drop policy if exists equipment_authorizations_update_scoped on public.equipment_authorizations;
drop policy if exists equipment_authorizations_delete_scoped on public.equipment_authorizations;
create policy equipment_authorizations_select_scoped on public.equipment_authorizations for select using (public.can_see_pilot(pilot_id));
create policy equipment_authorizations_insert_scoped on public.equipment_authorizations for insert with check (public.can_edit_unit_records(pilot_id));
create policy equipment_authorizations_update_scoped on public.equipment_authorizations for update using (public.can_edit_unit_records(pilot_id)) with check (public.can_edit_unit_records(pilot_id));
create policy equipment_authorizations_delete_scoped on public.equipment_authorizations for delete using (public.can_edit_unit_records(pilot_id));
