-- =============================================================================
-- Client request (Oct 29): when a pilot has two aircraft, the Qualification
-- Status (Co-Pilot, Pilot-in-Command, ...) should be separate for each one,
-- the same way Currency already is.
--
-- A crew qualification now says which aircraft it is for. Null = not tied to
-- one aircraft (only kept for a pilot with no aircraft on file yet).
-- Idempotent: safe to run twice.
-- =============================================================================

alter table public.pilot_crew_qualifications
  add column if not exists aircraft_type_code text references public.aircraft_types(code);

-- The old rule allowed one row per (pilot, role); drop it ...
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.pilot_crew_qualifications'::regclass and contype = 'u'
  loop
    execute format('alter table public.pilot_crew_qualifications drop constraint %I', c);
  end loop;
end $$;

-- ... in favour of one row per (pilot, role, aircraft).
create unique index if not exists pilot_crew_qualifications_pilot_role_aircraft_idx
  on public.pilot_crew_qualifications (pilot_id, role_code, coalesce(aircraft_type_code, ''));

-- Until now a role applied to the pilot whatever they flew, so carry each
-- existing status over to every aircraft the pilot is qualified on, then drop
-- the untied copy. A pilot with no aircraft yet keeps the untied row.
insert into public.pilot_crew_qualifications (pilot_id, role_code, qualified, aircraft_type_code, created_by, updated_by)
select cq.pilot_id, cq.role_code, cq.qualified, q.aircraft_type_code, cq.created_by, cq.updated_by
from public.pilot_crew_qualifications cq
join (select distinct pilot_id, aircraft_type_code from public.qualifications) q on q.pilot_id = cq.pilot_id
where cq.aircraft_type_code is null
on conflict do nothing;

delete from public.pilot_crew_qualifications cq
where cq.aircraft_type_code is null
  and exists (select 1 from public.qualifications q where q.pilot_id = cq.pilot_id);
