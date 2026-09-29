-- Two lookup rows needed for the real pilot roster import: MD-520MG (rotary,
-- flown by one pilot) and "Limited Pilot" (a crew-role designation the
-- client uses that had no equivalent row yet).

insert into public.aircraft_types (code, label, category, active, sort_order)
values ('md520mg', 'MD-520MG', 'rotary', true, 55);

insert into public.crew_roles (code, label, active, applies_to, sort_order)
values ('limited_pilot', 'Limited Pilot', true, array['fixed_wing', 'rotary'], 15);
