-- =============================================================================
-- Client feedback (2026-09): crew-role qualifications differ by position.
--   Fixed-Wing: Co-Pilot, Pilot-in-Command, Test Pilot, Instructor Pilot,
--               Flight Examiner
--   Rotary:     Co-Pilot, Pilot-in-Command, Element Lead, Test Pilot,
--               Flight Lead, Instructor Pilot, Flight Examiner
-- "Check Pilot" is in neither list.
--
-- Non-destructive: Check Pilot is marked inactive, not deleted, so any
-- existing pilot_crew_qualifications rows against it stay on file (and in
-- the audit log) -- they just stop displaying.
-- =============================================================================

alter table public.crew_roles
  add column active boolean not null default true,
  add column applies_to text[] not null default array['fixed_wing', 'rotary'];

-- Consistent global ordering (each position just shows its own subset).
update public.crew_roles set sort_order = 10, label = 'Co-Pilot'          where code = 'co_pilot';
update public.crew_roles set sort_order = 20, label = 'Pilot-in-Command'  where code = 'pic';
update public.crew_roles set sort_order = 60                              where code = 'instructor_pilot';
update public.crew_roles set sort_order = 70                              where code = 'flight_examiner';

update public.crew_roles set active = false where code = 'check_pilot';

insert into public.crew_roles (code, label, sort_order, applies_to) values
  ('element_lead', 'Element Lead', 30, array['rotary']),
  ('test_pilot',   'Test Pilot',   40, array['fixed_wing', 'rotary']),
  ('flight_lead',  'Flight Lead',  50, array['rotary']);
