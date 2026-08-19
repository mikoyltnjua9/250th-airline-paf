-- =============================================================================
-- Phase 4: StanEval & Check records.
-- =============================================================================
-- Unlike qualifications/flights/ape_records/currency_items (still
-- read-only in the app), this table gets full create/edit from day one,
-- per the agreed build order — "StanEval & Check form".
--
-- next_due_date is captured as entered by whoever fills the form, not
-- computed from a guessed cycle length — real StanEval cycle lengths vary
-- by check type/aircraft in ways that shouldn't be assumed.
-- =============================================================================

create type public.staneval_status as enum ('pass', 'fail');

create table public.staneval_records (
  id             uuid primary key default gen_random_uuid(),
  pilot_id       uuid not null references public.pilots(id) on delete cascade,
  eval_date      date not null,
  status         public.staneval_status not null,
  grading        text,
  next_due_date  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  updated_by     uuid references auth.users(id) on delete set null
);

alter table public.staneval_records enable row level security;
create index staneval_records_pilot_id_idx on public.staneval_records(pilot_id);

create trigger staneval_records_set_updated_at
  before update on public.staneval_records
  for each row execute function public.set_updated_at();

create policy staneval_records_select_authorized on public.staneval_records for select using (public.is_authorized());
create policy staneval_records_insert_authorized on public.staneval_records for insert with check (public.is_authorized());
create policy staneval_records_update_authorized on public.staneval_records for update using (public.is_authorized()) with check (public.is_authorized());
create policy staneval_records_delete_authorized on public.staneval_records for delete using (public.is_authorized());

-- Reuses the generic trigger function from the Phase 3 migration — StanEval
-- is one of the safety-critical tables the spec calls out for audit
-- logging.
create trigger staneval_records_audit
  after insert or update or delete on public.staneval_records
  for each row execute function public.audit_log_row_changes();
