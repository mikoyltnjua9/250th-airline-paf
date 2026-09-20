-- CBTA Training/Assessment Grade Slip for pilots.
-- One row per slip. Competency grades (1-4) and comments live in `grades`
-- jsonb keyed by competency code, so a slip is saved atomically. The rule that
-- turns grades into a verdict is enforced in the server action; the CHECK
-- below is a last line of defence: a slip can never be "competent" while
-- outcome is remedial.

create table public.cbta_assessments (
  id                 uuid primary key default gen_random_uuid(),
  pilot_id           uuid not null references public.pilots(id) on delete cascade,
  assessed_on        date not null,
  mode               text not null default 'training' check (mode in ('training', 'checking')),
  lesson             text,
  aircraft_tail_no   text,
  instructor_name    text,
  duration           text,
  itinerary          text,
  day_takeoff        int not null default 0 check (day_takeoff >= 0),
  day_landing        int not null default 0 check (day_landing >= 0),
  night_takeoff      int not null default 0 check (night_takeoff >= 0),
  night_landing      int not null default 0 check (night_landing >= 0),
  visual_count       int not null default 0 check (visual_count >= 0),
  rnp_count          int not null default 0 check (rnp_count >= 0),
  ils_count          int not null default 0 check (ils_count >= 0),
  vor_count          int not null default 0 check (vor_count >= 0),
  grades             jsonb not null default '{}'::jsonb,
  positive_remarks   text,
  developmental_remarks text,
  summary            text,
  student_concurrence boolean not null default false,
  trainee_competent  boolean not null,
  outcome            text not null check (outcome in ('remedial', 'passed', 'na')),
  decided_by         uuid references auth.users(id) on delete set null,
  decided_by_name    text,
  created_by         uuid references auth.users(id) on delete set null,
  updated_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (not (trainee_competent and outcome = 'remedial'))
);

create index cbta_assessments_pilot_idx on public.cbta_assessments(pilot_id, assessed_on desc);

alter table public.cbta_assessments enable row level security;

create policy cbta_assessments_select_authorized on public.cbta_assessments for select using (public.is_authorized());
create policy cbta_assessments_insert_authorized on public.cbta_assessments for insert with check (public.is_authorized());
create policy cbta_assessments_update_authorized on public.cbta_assessments for update using (public.is_authorized()) with check (public.is_authorized());
create policy cbta_assessments_delete_authorized on public.cbta_assessments for delete using (public.is_authorized());

create trigger cbta_assessments_set_updated_at
  before update on public.cbta_assessments
  for each row execute function public.set_updated_at();

create trigger cbta_assessments_audit
  after insert or update or delete on public.cbta_assessments
  for each row execute function public.audit_log_row_changes();
