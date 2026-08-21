-- =============================================================================
-- Schema for the September presentation dashboard redesign (client mockup,
-- shared 2026-08-20, scoped 2026-08-22): pilot contact info + a new
-- crew-role qualification dimension (Pilot in Command / Co-Pilot /
-- Instructor Pilot / Flight Examiner / Check Pilot), separate from the
-- existing per-aircraft-type qualifications table. The mockup's Duty &
-- Workload gauge is deliberately NOT backed by new schema here — it's
-- derived from real flight dates already in `flights`, not a fabricated
-- or manually-tracked figure (no duty-roster/clock-in-out data exists).
-- =============================================================================

alter table public.pilots
  add column contact_phone text,
  add column contact_email text;

-- ---------------------------------------------------------------------------
-- crew_roles: fixed lookup, same pattern as ranks/aircraft_types.
-- ---------------------------------------------------------------------------
create table public.crew_roles (
  code       text primary key,
  label      text not null,
  sort_order int not null,
  created_at timestamptz not null default now()
);

alter table public.crew_roles enable row level security;

insert into public.crew_roles (code, label, sort_order) values
  ('pic',               'Pilot in Command',  10),
  ('co_pilot',          'Co-Pilot',          20),
  ('instructor_pilot',  'Instructor Pilot',  30),
  ('flight_examiner',   'Flight Examiner',   40),
  ('check_pilot',       'Check Pilot',       50);

create policy crew_roles_select_authorized on public.crew_roles for select using (public.is_authorized());

-- ---------------------------------------------------------------------------
-- pilot_crew_qualifications: one row per (pilot, role), like currency_items
-- -- not a history log. Safety-critical the same way aircraft-type
-- qualifications are (determines what duties a pilot is authorized for),
-- so it gets the same audit trigger.
-- ---------------------------------------------------------------------------
create table public.pilot_crew_qualifications (
  id         uuid primary key default gen_random_uuid(),
  pilot_id   uuid not null references public.pilots(id) on delete cascade,
  role_code  text not null references public.crew_roles(code),
  qualified  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (pilot_id, role_code)
);

alter table public.pilot_crew_qualifications enable row level security;
create index pilot_crew_qualifications_pilot_id_idx on public.pilot_crew_qualifications(pilot_id);

create trigger pilot_crew_qualifications_set_updated_at
  before update on public.pilot_crew_qualifications
  for each row execute function public.set_updated_at();

create trigger pilot_crew_qualifications_audit
  after insert or update or delete on public.pilot_crew_qualifications
  for each row execute function public.audit_log_row_changes();

create policy pilot_crew_qualifications_select_authorized on public.pilot_crew_qualifications for select using (public.is_authorized());
create policy pilot_crew_qualifications_insert_authorized on public.pilot_crew_qualifications for insert with check (public.is_authorized());
create policy pilot_crew_qualifications_update_authorized on public.pilot_crew_qualifications for update using (public.is_authorized()) with check (public.is_authorized());
create policy pilot_crew_qualifications_delete_authorized on public.pilot_crew_qualifications for delete using (public.is_authorized());
