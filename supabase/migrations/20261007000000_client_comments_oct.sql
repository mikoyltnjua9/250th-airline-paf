-- Client comments, October 2026.

-- ---------------------------------------------------------------------------
-- "Limited Pilot" is not a qualification: take it out. (Added for the roster
-- import; the client has since said it shouldn't be there.)
-- ---------------------------------------------------------------------------
delete from public.pilot_crew_qualifications where role_code = 'limited_pilot';
delete from public.crew_roles where code = 'limited_pilot';

-- ---------------------------------------------------------------------------
-- MD-520MG was a typo in the roster sheet: remove the aircraft and the one
-- qualification entered with it.
-- ---------------------------------------------------------------------------
delete from public.qualifications where aircraft_type_code = 'md520mg';
delete from public.aircraft_types where code = 'md520mg';

-- "Flight Lead" is called "Flight Commander".
update public.crew_roles set label = 'Flight Commander' where code = 'flight_lead';

-- ---------------------------------------------------------------------------
-- Currency per aircraft. A pilot qualified on two aircraft has a separate
-- Last Flight / IFR / ... currency for each, so the record now says which
-- aircraft it is for. (Null = not tied to one aircraft.)
-- ---------------------------------------------------------------------------
alter table public.currency_items
  add column aircraft_type_code text references public.aircraft_types(code);

-- The old rule allowed one row per (pilot, requirement); drop it ...
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.currency_items'::regclass and contype = 'u'
  loop
    execute format('alter table public.currency_items drop constraint %I', c);
  end loop;
end $$;

-- ... in favour of one row per (pilot, requirement, aircraft).
create unique index currency_items_pilot_item_aircraft_idx
  on public.currency_items (pilot_id, item_type, coalesce(aircraft_type_code, ''));

-- ---------------------------------------------------------------------------
-- CBTA grade slip e-signatures: the instructor/examiner's and the student's
-- (concurrence), each a small PNG drawn on screen, with when it was signed.
-- ---------------------------------------------------------------------------
alter table public.cbta_assessments
  add column instructor_signature text,
  add column instructor_signed_at timestamptz,
  add column student_signature text,
  add column student_signed_at timestamptz,
  add constraint cbta_instructor_signature_check check (
    instructor_signature is null
    or (instructor_signature like 'data:image/png;base64,%' and length(instructor_signature) <= 200000)
  ),
  add constraint cbta_student_signature_check check (
    student_signature is null
    or (student_signature like 'data:image/png;base64,%' and length(student_signature) <= 200000)
  );

-- The audit log records every changed field's old and new value; for a
-- signature that would copy a whole image into the log each time, so it just
-- notes that one is on file. (Otherwise identical to the original function.)
create or replace function public.audit_log_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  col      text;
  old_val  text;
  new_val  text;
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (table_name, record_id, field_changed, old_value, new_value, changed_by)
    values (TG_TABLE_NAME, NEW.id, '(record created)', null, null, auth.uid());
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (table_name, record_id, field_changed, old_value, new_value, changed_by)
    values (TG_TABLE_NAME, OLD.id, '(record deleted)', null, null, auth.uid());
    return OLD;
  end if;

  -- UPDATE: log one row per column that actually changed.
  for col in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = TG_TABLE_NAME
      and column_name not in ('created_at', 'updated_at', 'created_by', 'updated_by')
  loop
    execute format('select ($1).%I::text', col) using OLD into old_val;
    execute format('select ($1).%I::text', col) using NEW into new_val;
    if old_val is distinct from new_val then
      if col like '%\_signature' then
        old_val := case when old_val is null then null else '(signature on file)' end;
        new_val := case when new_val is null then null else '(signature on file)' end;
      end if;
      insert into public.audit_log (table_name, record_id, field_changed, old_value, new_value, changed_by)
      values (TG_TABLE_NAME, NEW.id, col, old_val, new_val, auth.uid());
    end if;
  end loop;
  return NEW;
end;
$$;

-- ---------------------------------------------------------------------------
-- Written exams for pilots (one Stan/Eval exam per aircraft).
-- ---------------------------------------------------------------------------
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.exam_sets'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%audience%'
  loop
    execute format('alter table public.exam_sets drop constraint %I', c);
  end loop;
end $$;

alter table public.exam_sets
  add constraint exam_sets_audience_check check (audience in ('maintenance', 'cabin_crew', 'pilot'));

-- A pilot exam belongs to one aircraft, so a pilot is offered the exams for the
-- aircraft they fly.
alter table public.exam_sets
  add column aircraft_type_code text references public.aircraft_types(code);

-- How many questions one sitting draws at random from the set's bank. Null =
-- the whole set (how every existing exam works).
alter table public.exam_sets
  add column questions_per_attempt int check (questions_per_attempt is null or questions_per_attempt > 0);
