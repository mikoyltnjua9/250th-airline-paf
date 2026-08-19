-- =============================================================================
-- Training Records: pilot_id, training type, status, date -- per the
-- original spec's core data model. History-style, same pattern as
-- StanEval/APE (multiple training events per pilot over time), full
-- create/edit from the Pilot Profile.
--
-- No audit trigger -- consistent with `flights`, this table was never in
-- the spec's safety-critical audit list (only
-- qualifications/ape_records/staneval_records/license status are).
--
-- training_type is free text, not a lookup table -- unlike ranks/aircraft
-- types, training program names are the kind of thing that changes
-- often and isn't worth a controlled vocabulary for v1.
-- =============================================================================

create type public.training_status as enum ('completed', 'scheduled', 'overdue');

create table public.training_records (
  id             uuid primary key default gen_random_uuid(),
  pilot_id       uuid not null references public.pilots(id) on delete cascade,
  training_type  text not null,
  status         public.training_status not null default 'scheduled',
  training_date  date not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  updated_by     uuid references auth.users(id) on delete set null
);

alter table public.training_records enable row level security;
create index training_records_pilot_id_idx on public.training_records(pilot_id);

create trigger training_records_set_updated_at
  before update on public.training_records
  for each row execute function public.set_updated_at();

create policy training_records_select_authorized on public.training_records for select using (public.is_authorized());
create policy training_records_insert_authorized on public.training_records for insert with check (public.is_authorized());
create policy training_records_update_authorized on public.training_records for update using (public.is_authorized()) with check (public.is_authorized());
create policy training_records_delete_authorized on public.training_records for delete using (public.is_authorized());
