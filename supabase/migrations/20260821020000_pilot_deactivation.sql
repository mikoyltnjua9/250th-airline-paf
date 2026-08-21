-- =============================================================================
-- Deactivate/reactivate for pilots, chosen over hard delete (2026-08-21
-- discussion): removing a pilot who's left the wing should hide them from
-- active views, not destroy their flight/qualification/currency/APE/
-- StanEval/training history. A deactivated pilot's records stay fully
-- intact and reachable; every wing-wide view (Directory, Dashboard,
-- Alerts, Duty & Workload, Reports) filters to active = true.
-- =============================================================================

alter table public.pilots
  add column active boolean not null default true;

create index pilots_active_idx on public.pilots(active);
