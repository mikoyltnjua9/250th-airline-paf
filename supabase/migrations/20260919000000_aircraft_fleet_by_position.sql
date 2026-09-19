-- =============================================================================
-- Client feedback (2026-09): the wing's real fleet is G280, H800XP, C295
-- (fixed-wing) and Bell 412, S-70i Black Hawk (rotary). Fokker F28 and
-- N-22B Nomad are not part of it.
--
-- Non-destructive on purpose: F28/Nomad are marked inactive, NOT deleted.
-- Three real pilots have qualification records against them (and flights may
-- reference them); those records stay intact as history. Inactive types just
-- drop out of new-entry dropdowns and the wing-wide summaries.
--
-- `category` links an aircraft to a pilot position (Fixed-Wing Pilot ->
-- fixed_wing, Rotary Pilot -> rotary) so forms only offer relevant aircraft.
-- =============================================================================

alter table public.aircraft_types
  add column category text check (category in ('fixed_wing', 'rotary')),
  add column active boolean not null default true;

update public.aircraft_types set category = 'fixed_wing' where code in ('c295', 'g280', 'f28', 'n22b');
update public.aircraft_types set category = 'rotary'     where code in ('bell412', 's70i');

update public.aircraft_types set active = false where code in ('f28', 'n22b');

insert into public.aircraft_types (code, label, sort_order, category, active)
values ('h800xp', 'H800XP', 45, 'fixed_wing', true);
