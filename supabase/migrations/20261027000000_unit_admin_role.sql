-- Unit Admin accounts (client request, October 2026): one shared login per unit
-- (251st, 252nd, 480th, 481st) that enters the data for ITS OWN people.
--
--   unit_admin   sees only the people whose Unit matches the account's unit;
--                adds / edits those people, their qualifications, APE (the
--                status, not the medical certificate), flights and currency.
--                Cannot touch StanEval, Training, CBTA, written exams or other
--                accounts, and cannot move a person to another unit.
--
-- As with the other roles, the rules live here, in the database: an account for
-- one unit cannot read or change another unit's people even with a hand-made
-- request. Every account still needs 2FA (aal2). Safe to run more than once.

alter table public.profiles add column if not exists unit text;

insert into public.roles (code, label, description) values
  ('unit_admin', 'Unit Admin',
   'Enters and edits the personnel, qualifications, APE, flights and currency of one unit only. Cannot see other units. No access to StanEval, training, CBTA, exams or accounts.')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_unit()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select unit from public.profiles where id = auth.uid();
$$;

-- Does this unit name (as typed on a person's record) belong to the signed-in
-- unit admin? Case and stray spaces don't matter. Reads only the row's own
-- value, so it also works inside INSERT ... RETURNING.
create or replace function public.is_my_unit_name(p_unit text)
returns boolean
language sql
stable
as $$
  select public.has_mfa()
    and coalesce(public.current_role_code() = 'unit_admin', false)
    and p_unit is not null
    and public.current_unit() is not null
    and lower(btrim(p_unit)) = lower(btrim(public.current_unit()));
$$;

create or replace function public.in_my_unit(p_pilot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pilots p
    where p.id = p_pilot_id and public.is_my_unit_name(p.unit_section)
  );
$$;

-- Safety records a unit admin may also enter for its own people.
create or replace function public.can_edit_unit_records(p_pilot_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_safety_editor() or public.in_my_unit(p_pilot_id);
$$;

-- Any staff role may read the shared lookup tables.
create or replace function public.has_staff_access()
returns boolean
language sql
stable
as $$
  select public.has_mfa()
    and coalesce(public.current_role_code() in ('super_admin', 'rotary_admin', 'fixed_wing_admin', 'safety_office', 'unit_admin'), false);
$$;

create or replace function public.can_see_pilot(p_pilot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_mfa() and (
    coalesce(public.current_role_code() in ('super_admin', 'safety_office'), false)
    or (public.current_role_code() = 'rotary_admin'
        and exists (select 1 from public.pilots p where p.id = p_pilot_id and p.position = 'Rotary Pilot'))
    or (public.current_role_code() = 'fixed_wing_admin'
        and exists (select 1 from public.pilots p where p.id = p_pilot_id and p.position = 'Fixed-Wing Pilot'))
    or public.in_my_unit(p_pilot_id)
  );
$$;

create or replace function public.can_edit_flying(p_pilot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_mfa() and (
    public.current_role_code() = 'super_admin'
    or (public.current_role_code() = 'rotary_admin'
        and exists (select 1 from public.pilots p where p.id = p_pilot_id and p.position = 'Rotary Pilot'))
    or (public.current_role_code() = 'fixed_wing_admin'
        and exists (select 1 from public.pilots p where p.id = p_pilot_id and p.position = 'Fixed-Wing Pilot'))
    or public.in_my_unit(p_pilot_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- People: a unit admin adds and edits people of its own unit, and cannot move
-- anyone out of it (the new value must still be its own unit). No delete --
-- a person is deactivated, which is an edit.
-- ---------------------------------------------------------------------------
drop policy if exists pilots_select_unit on public.pilots;
drop policy if exists pilots_insert_unit on public.pilots;
drop policy if exists pilots_update_unit on public.pilots;
create policy pilots_select_unit on public.pilots for select using (public.is_my_unit_name(unit_section));
create policy pilots_insert_unit on public.pilots for insert with check (public.is_my_unit_name(unit_section));
create policy pilots_update_unit on public.pilots for update
  using (public.is_my_unit_name(unit_section))
  with check (public.is_my_unit_name(unit_section));

-- Photos live in a public bucket under the person's id; any unit admin may add one.
drop policy if exists pilot_photos_unit_insert on storage.objects;
drop policy if exists pilot_photos_unit_update on storage.objects;
create policy pilot_photos_unit_insert on storage.objects for insert
  with check (bucket_id = 'pilot-photos' and public.has_mfa() and coalesce(public.current_role_code() = 'unit_admin', false));
create policy pilot_photos_unit_update on storage.objects for update
  using (bucket_id = 'pilot-photos' and public.has_mfa() and coalesce(public.current_role_code() = 'unit_admin', false));

-- ---------------------------------------------------------------------------
-- Records a unit admin may change for its own people: qualifications, crew
-- qualifications, licenses and APE. (The medical certificate files stay with
-- the safety office: that storage policy is untouched.)
-- ---------------------------------------------------------------------------
drop policy if exists licenses_insert_scoped on public.licenses;
drop policy if exists licenses_update_scoped on public.licenses;
drop policy if exists licenses_delete_scoped on public.licenses;
create policy licenses_insert_scoped on public.licenses for insert with check (public.can_edit_unit_records(pilot_id));
create policy licenses_update_scoped on public.licenses for update using (public.can_edit_unit_records(pilot_id)) with check (public.can_edit_unit_records(pilot_id));
create policy licenses_delete_scoped on public.licenses for delete using (public.can_edit_unit_records(pilot_id));

drop policy if exists qualifications_insert_scoped on public.qualifications;
drop policy if exists qualifications_update_scoped on public.qualifications;
drop policy if exists qualifications_delete_scoped on public.qualifications;
create policy qualifications_insert_scoped on public.qualifications for insert with check (public.can_edit_unit_records(pilot_id));
create policy qualifications_update_scoped on public.qualifications for update using (public.can_edit_unit_records(pilot_id)) with check (public.can_edit_unit_records(pilot_id));
create policy qualifications_delete_scoped on public.qualifications for delete using (public.can_edit_unit_records(pilot_id));

drop policy if exists pilot_crew_qualifications_insert_scoped on public.pilot_crew_qualifications;
drop policy if exists pilot_crew_qualifications_update_scoped on public.pilot_crew_qualifications;
drop policy if exists pilot_crew_qualifications_delete_scoped on public.pilot_crew_qualifications;
create policy pilot_crew_qualifications_insert_scoped on public.pilot_crew_qualifications for insert with check (public.can_edit_unit_records(pilot_id));
create policy pilot_crew_qualifications_update_scoped on public.pilot_crew_qualifications for update using (public.can_edit_unit_records(pilot_id)) with check (public.can_edit_unit_records(pilot_id));
create policy pilot_crew_qualifications_delete_scoped on public.pilot_crew_qualifications for delete using (public.can_edit_unit_records(pilot_id));

drop policy if exists ape_records_insert_scoped on public.ape_records;
drop policy if exists ape_records_update_scoped on public.ape_records;
drop policy if exists ape_records_delete_scoped on public.ape_records;
create policy ape_records_insert_scoped on public.ape_records for insert with check (public.can_edit_unit_records(pilot_id));
create policy ape_records_update_scoped on public.ape_records for update using (public.can_edit_unit_records(pilot_id)) with check (public.can_edit_unit_records(pilot_id));
create policy ape_records_delete_scoped on public.ape_records for delete using (public.can_edit_unit_records(pilot_id));
