-- Enlisted personnel (maintenance + aircrew rosters):
--  * a free-text "designation" on the person record -- the duty/qualification
--    wording the units use ("C295 Flight Engineer", "Helicopter Mechanic", ...)
--  * the enlisted ranks. sort_order runs junior -> senior and sits below the
--    officer ranks (2Lt = 10), so it is negative.
-- Safe to run more than once.
alter table public.pilots
  add column if not exists designation text;

insert into public.ranks (code, label, sort_order) values
  ('AM',     'Airman',                    -120),
  ('AW',     'Airwoman',                  -110),
  ('A2C',    'Airman Second Class',       -100),
  ('AW2C',   'Airwoman Second Class',      -90),
  ('A1C',    'Airman First Class',         -80),
  ('AW1C',   'Airwoman First Class',       -70),
  ('Sgt',    'Sergeant',                   -60),
  ('Sgt(T)', 'Sergeant (T)',               -50),
  ('SSg',    'Staff Sergeant',             -40),
  ('SSg(T)', 'Staff Sergeant (T)',         -30),
  ('TSg',    'Technical Sergeant',         -20),
  ('MSg',    'Master Sergeant',            -10)
on conflict (code) do nothing;
