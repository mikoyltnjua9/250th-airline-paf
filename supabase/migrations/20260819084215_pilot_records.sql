-- =============================================================================
-- Phase 3: pilot core record — pilots, licenses, qualifications, flights,
-- APE records, currency items, plus the audit_log the spec requires for
-- every change to a safety-critical field.
-- =============================================================================
-- Scope for this phase (per the agreed build order): pilots + licenses are
-- fully read/write from the app (Add/Edit Pilot form). Qualifications,
-- flights, APE records, and currency items are read-only in the app for
-- now — they get their own dedicated CRUD screens in later phases
-- (Qualifications, Flying Hours & History, APE Status, Currency Status).
-- They're seeded directly via SQL in the next migration.
--
-- List *contents* below (aircraft types, ranks) are placeholders — per the
-- client, a data entry specialist corrects these after the build is done.
-- The *structure* (lookup tables vs. enums, column shapes) is deliberate.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ranks: lookup table (not a Postgres enum) so adding one later is an
-- INSERT — same pattern as `roles`.
-- ---------------------------------------------------------------------------
create table public.ranks (
  code       text primary key,
  label      text not null,
  sort_order int not null,
  created_at timestamptz not null default now()
);

alter table public.ranks enable row level security;

insert into public.ranks (code, label, sort_order) values
  ('2Lt',   '2nd Lieutenant', 10),
  ('1Lt',   '1st Lieutenant', 20),
  ('Capt',  'Captain',        30),
  ('Maj',   'Major',          40),
  ('LtCol', 'Lieutenant Colonel', 50),
  ('Col',   'Colonel',        60);

create policy ranks_select_authorized on public.ranks for select using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- aircraft_types: lookup table, same reasoning as ranks.
-- ---------------------------------------------------------------------------
create table public.aircraft_types (
  code       text primary key,
  label      text not null,
  sort_order int not null,
  created_at timestamptz not null default now()
);

alter table public.aircraft_types enable row level security;

insert into public.aircraft_types (code, label, sort_order) values
  ('f28',      'Fokker F28',       10),
  ('bell412',  'Bell 412',         20),
  ('c295',     'C295',             30),
  ('g280',     'Gulfstream G280',  40),
  ('s70i',     'S-70i Black Hawk', 50),
  ('n22b',     'N-22B Nomad',      60);

create policy aircraft_types_select_authorized on public.aircraft_types for select using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- pilots
-- ---------------------------------------------------------------------------
create table public.pilots (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  rank_code    text not null references public.ranks(code),
  afsn         text not null unique,
  unit_section text,
  position     text not null default 'Pilot',
  photo_url    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  updated_by   uuid references auth.users(id) on delete set null
);

alter table public.pilots enable row level security;
create index pilots_rank_code_idx on public.pilots(rank_code);

create trigger pilots_set_updated_at
  before update on public.pilots
  for each row execute function public.set_updated_at();

create policy pilots_select_authorized on public.pilots for select using (public.is_authorized());
create policy pilots_insert_authorized on public.pilots for insert with check (public.is_authorized());
create policy pilots_update_authorized on public.pilots for update using (public.is_authorized()) with check (public.is_authorized());
create policy pilots_delete_authorized on public.pilots for delete using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- licenses
-- ---------------------------------------------------------------------------
create type public.license_status as enum ('valid', 'expired', 'revoked', 'suspended');

create table public.licenses (
  id                 uuid primary key default gen_random_uuid(),
  pilot_id           uuid not null references public.pilots(id) on delete cascade,
  license_no         text not null unique,
  date_issued        date not null,
  date_expires       date not null,
  status             public.license_status not null default 'valid',
  -- Long, random, unguessable — NOT the sequential license number. This is
  -- what the future public "Scan to Verify" QR encodes, per the spec's
  -- explicit anti-enumeration requirement. That public route isn't built
  -- yet (License Verification phase), but the token is generated now so
  -- it's never retrofitted onto existing rows later.
  public_verify_token uuid not null default gen_random_uuid() unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null,
  updated_by         uuid references auth.users(id) on delete set null
);

alter table public.licenses enable row level security;
create index licenses_pilot_id_idx on public.licenses(pilot_id);

create trigger licenses_set_updated_at
  before update on public.licenses
  for each row execute function public.set_updated_at();

create policy licenses_select_authorized on public.licenses for select using (public.is_authorized());
create policy licenses_insert_authorized on public.licenses for insert with check (public.is_authorized());
create policy licenses_update_authorized on public.licenses for update using (public.is_authorized()) with check (public.is_authorized());
create policy licenses_delete_authorized on public.licenses for delete using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- qualifications (read-only in the app for now — own CRUD screen later)
-- ---------------------------------------------------------------------------
create type public.qualification_status as enum ('current', 'expiring_soon', 'expired', 'in_training');

create table public.qualifications (
  id             uuid primary key default gen_random_uuid(),
  pilot_id       uuid not null references public.pilots(id) on delete cascade,
  aircraft_type_code text not null references public.aircraft_types(code),
  status         public.qualification_status not null default 'in_training',
  date_earned    date,
  expiry_date    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  updated_by     uuid references auth.users(id) on delete set null
);

alter table public.qualifications enable row level security;
create index qualifications_pilot_id_idx on public.qualifications(pilot_id);

create trigger qualifications_set_updated_at
  before update on public.qualifications
  for each row execute function public.set_updated_at();

create policy qualifications_select_authorized on public.qualifications for select using (public.is_authorized());
create policy qualifications_insert_authorized on public.qualifications for insert with check (public.is_authorized());
create policy qualifications_update_authorized on public.qualifications for update using (public.is_authorized()) with check (public.is_authorized());
create policy qualifications_delete_authorized on public.qualifications for delete using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- flights (flying hours & history — read-only in the app for now)
-- ---------------------------------------------------------------------------
create type public.flight_duty as enum ('PIC', 'SIC', 'IP', 'Student');

create table public.flights (
  id                 uuid primary key default gen_random_uuid(),
  pilot_id           uuid not null references public.pilots(id) on delete cascade,
  flight_date        date not null,
  aircraft_type_code text not null references public.aircraft_types(code),
  route              text,
  duty               public.flight_duty not null,
  flying_time_hours  numeric(5,1) not null,
  block_time_hours   numeric(5,1),
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null
);

alter table public.flights enable row level security;
create index flights_pilot_id_idx on public.flights(pilot_id);
create index flights_flight_date_idx on public.flights(flight_date);

create policy flights_select_authorized on public.flights for select using (public.is_authorized());
create policy flights_insert_authorized on public.flights for insert with check (public.is_authorized());
create policy flights_update_authorized on public.flights for update using (public.is_authorized()) with check (public.is_authorized());
create policy flights_delete_authorized on public.flights for delete using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- ape_records (physical exam status — read-only in the app for now)
-- ---------------------------------------------------------------------------
create table public.ape_records (
  id             uuid primary key default gen_random_uuid(),
  pilot_id       uuid not null references public.pilots(id) on delete cascade,
  last_ape_date  date not null,
  next_due_date  date not null,
  fit_to_fly     boolean not null default true,
  classification text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  updated_by     uuid references auth.users(id) on delete set null
);

alter table public.ape_records enable row level security;
create index ape_records_pilot_id_idx on public.ape_records(pilot_id);

create trigger ape_records_set_updated_at
  before update on public.ape_records
  for each row execute function public.set_updated_at();

create policy ape_records_select_authorized on public.ape_records for select using (public.is_authorized());
create policy ape_records_insert_authorized on public.ape_records for insert with check (public.is_authorized());
create policy ape_records_update_authorized on public.ape_records for update using (public.is_authorized()) with check (public.is_authorized());
create policy ape_records_delete_authorized on public.ape_records for delete using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- currency_items (read-only in the app for now)
-- ---------------------------------------------------------------------------
create type public.currency_item_type as enum ('last_flight', 'ifr', 'night_proficiency', 'peculiar_runways');

create table public.currency_items (
  id             uuid primary key default gen_random_uuid(),
  pilot_id       uuid not null references public.pilots(id) on delete cascade,
  item_type      public.currency_item_type not null,
  last_date      date not null,
  validity_days  int not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  updated_by     uuid references auth.users(id) on delete set null,
  unique (pilot_id, item_type)
);

alter table public.currency_items enable row level security;
create index currency_items_pilot_id_idx on public.currency_items(pilot_id);

create trigger currency_items_set_updated_at
  before update on public.currency_items
  for each row execute function public.set_updated_at();

create policy currency_items_select_authorized on public.currency_items for select using (public.is_authorized());
create policy currency_items_insert_authorized on public.currency_items for insert with check (public.is_authorized());
create policy currency_items_update_authorized on public.currency_items for update using (public.is_authorized()) with check (public.is_authorized());
create policy currency_items_delete_authorized on public.currency_items for delete using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- audit_log — automatic, field-level change tracking on safety-critical
-- tables. No approval workflow (per spec) — just record who/when/what.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id            bigint generated always as identity primary key,
  table_name    text not null,
  record_id     uuid not null,
  field_changed text not null,
  old_value     text,
  new_value     text,
  changed_by    uuid references auth.users(id) on delete set null,
  changed_at    timestamptz not null default now()
);

alter table public.audit_log enable row level security;
create index audit_log_record_idx on public.audit_log(table_name, record_id);

-- Read-only from the app: authorized super_admins can view the trail.
-- No insert/update/delete policy is defined for any role — the trigger
-- function below runs as its owner (table owner bypasses RLS), so it can
-- still write rows; direct writes from the app are correctly denied by
-- default.
create policy audit_log_select_authorized on public.audit_log for select using (public.is_authorized());

create or replace function public.audit_log_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  col      text;
  old_val  text;
  new_val  text;
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (table_name, record_id, field_changed, old_value, new_value, changed_by)
    values (TG_TABLE_NAME, NEW.id, '(record created)', null, null, auth.uid());
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (table_name, record_id, field_changed, old_value, new_value, changed_by)
    values (TG_TABLE_NAME, OLD.id, '(record deleted)', null, null, auth.uid());
    return OLD;
  end if;

  -- UPDATE: log one row per column that actually changed.
  for col in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = TG_TABLE_NAME
      and column_name not in ('created_at', 'updated_at', 'created_by', 'updated_by')
  loop
    execute format('select ($1).%I::text', col) using OLD into old_val;
    execute format('select ($1).%I::text', col) using NEW into new_val;
    if old_val is distinct from new_val then
      insert into public.audit_log (table_name, record_id, field_changed, old_value, new_value, changed_by)
      values (TG_TABLE_NAME, NEW.id, col, old_val, new_val, auth.uid());
    end if;
  end loop;
  return NEW;
end;
$$;

create trigger licenses_audit
  after insert or update or delete on public.licenses
  for each row execute function public.audit_log_row_changes();

create trigger qualifications_audit
  after insert or update or delete on public.qualifications
  for each row execute function public.audit_log_row_changes();

create trigger ape_records_audit
  after insert or update or delete on public.ape_records
  for each row execute function public.audit_log_row_changes();
