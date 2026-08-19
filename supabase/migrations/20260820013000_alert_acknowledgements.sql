-- =============================================================================
-- Alerts & Notifications: acknowledge/dismiss for the wing-wide alerts page.
-- Alerts themselves stay computed on the fly from existing tables
-- (licenses/qualifications/currency_items/ape_records/staneval_records) —
-- there was never a "pending alerts" table and there still isn't one. This
-- table only records that a specific alert was seen and is being handled.
--
-- alert_key is a stable identity built in the app
-- (`${category}:${pilotId}:${subKey}:${status}` — see src/lib/alerts/queries.ts),
-- not a random id. If the underlying condition changes (e.g. a qualification
-- moves from expiring_soon to expired), the key changes and the alert
-- re-surfaces as unacknowledged. Deliberate: an acknowledgement covers the
-- specific situation reviewed, not "anything about this pilot, forever."
-- =============================================================================

create table public.alert_acknowledgements (
  id              uuid primary key default gen_random_uuid(),
  alert_key       text not null unique,
  pilot_id        uuid not null references public.pilots(id) on delete cascade,
  category        text not null,
  acknowledged_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id) on delete set null
);

alter table public.alert_acknowledgements enable row level security;
create index alert_acknowledgements_pilot_id_idx on public.alert_acknowledgements(pilot_id);

-- No update policy: an acknowledgement is either created (insert) or
-- withdrawn (delete) — there's nothing on this row that ever gets edited.
create policy alert_acknowledgements_select_authorized on public.alert_acknowledgements for select using (public.is_authorized());
create policy alert_acknowledgements_insert_authorized on public.alert_acknowledgements for insert with check (public.is_authorized());
create policy alert_acknowledgements_delete_authorized on public.alert_acknowledgements for delete using (public.is_authorized());
