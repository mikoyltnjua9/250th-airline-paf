-- Three new account types (client request, October 2026):
--
--   rotary_admin       enters flights, flying hours and currency for ROTARY
--                      pilots only; read-only on the rest of their profiles
--   fixed_wing_admin   the same for FIXED-WING pilots only
--   safety_office      edits Qualifications, APE, StanEval, Training, CBTA
--                      slips and written exams for ALL personnel (pilots,
--                      maintenance, cabin crew); read-only on flights/currency
--
-- super_admin keeps full access. Every account still needs 2FA (aal2).
-- The rules live HERE, in the database, so they hold no matter what the app
-- shows: a rotary admin cannot read or change a fixed-wing pilot even by
-- crafting a request by hand.

insert into public.roles (code, label, description) values
  ('rotary_admin',     'Rotary Wing Admin',
   'Enters flights, flying hours and currency for rotary-wing pilots only. Read-only on the rest of their profiles. Cannot see fixed-wing pilots.'),
  ('fixed_wing_admin', 'Fixed-Wing Admin',
   'Enters flights, flying hours and currency for fixed-wing pilots only. Read-only on the rest of their profiles. Cannot see rotary-wing pilots.'),
  ('safety_office',    'Safety Office Admin',
   'Edits Qualifications, APE (with medical certificates), StanEval, Training, CBTA grade slips and written exams for all personnel. Read-only on flights and currency.')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER where they read `pilots`/`profiles`, so they don't
-- recurse into the policies that call them.
-- ---------------------------------------------------------------------------

-- Any signed-in-with-2FA staff role (used for the shared lookup tables).
create or replace function public.has_staff_access()
returns boolean
language sql
stable
as $$
  select public.has_mfa()
    and coalesce(public.current_role_code() in ('super_admin', 'rotary_admin', 'fixed_wing_admin', 'safety_office'), false);
$$;

-- Qualifications / APE / StanEval / Training / CBTA / exams: super admin and
-- the safety office, for everyone.
create or replace function public.is_safety_editor()
returns boolean
language sql
stable
as $$
  select public.has_mfa()
    and coalesce(public.current_role_code() in ('super_admin', 'safety_office'), false);
$$;

-- May this user see this person? Super admin and safety office: everyone.
-- A wing admin: only pilots of their own wing.
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
  );
$$;

-- May this user add / change / delete flights and currency for this person?
-- Super admin, or the wing admin of that pilot's wing. (Not the safety office.)
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
  );
$$;

-- ---------------------------------------------------------------------------
-- pilots: who can SEE which people. Adding / editing / removing people stays
-- with the super admin.
-- ---------------------------------------------------------------------------
drop policy if exists pilots_select_authorized on public.pilots;
create policy pilots_select_scoped on public.pilots for select using (public.can_see_pilot(id));

-- ---------------------------------------------------------------------------
-- Safety records: everyone who can see the person may read; only the safety
-- office / super admin may change.
-- ---------------------------------------------------------------------------
drop policy if exists licenses_select_authorized on public.licenses;
drop policy if exists licenses_insert_authorized on public.licenses;
drop policy if exists licenses_update_authorized on public.licenses;
drop policy if exists licenses_delete_authorized on public.licenses;
create policy licenses_select_scoped on public.licenses for select using (public.can_see_pilot(pilot_id));
create policy licenses_insert_scoped on public.licenses for insert with check (public.is_safety_editor());
create policy licenses_update_scoped on public.licenses for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy licenses_delete_scoped on public.licenses for delete using (public.is_safety_editor());

drop policy if exists qualifications_select_authorized on public.qualifications;
drop policy if exists qualifications_insert_authorized on public.qualifications;
drop policy if exists qualifications_update_authorized on public.qualifications;
drop policy if exists qualifications_delete_authorized on public.qualifications;
create policy qualifications_select_scoped on public.qualifications for select using (public.can_see_pilot(pilot_id));
create policy qualifications_insert_scoped on public.qualifications for insert with check (public.is_safety_editor());
create policy qualifications_update_scoped on public.qualifications for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy qualifications_delete_scoped on public.qualifications for delete using (public.is_safety_editor());

drop policy if exists pilot_crew_qualifications_select_authorized on public.pilot_crew_qualifications;
drop policy if exists pilot_crew_qualifications_insert_authorized on public.pilot_crew_qualifications;
drop policy if exists pilot_crew_qualifications_update_authorized on public.pilot_crew_qualifications;
drop policy if exists pilot_crew_qualifications_delete_authorized on public.pilot_crew_qualifications;
create policy pilot_crew_qualifications_select_scoped on public.pilot_crew_qualifications for select using (public.can_see_pilot(pilot_id));
create policy pilot_crew_qualifications_insert_scoped on public.pilot_crew_qualifications for insert with check (public.is_safety_editor());
create policy pilot_crew_qualifications_update_scoped on public.pilot_crew_qualifications for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy pilot_crew_qualifications_delete_scoped on public.pilot_crew_qualifications for delete using (public.is_safety_editor());

drop policy if exists ape_records_select_authorized on public.ape_records;
drop policy if exists ape_records_insert_authorized on public.ape_records;
drop policy if exists ape_records_update_authorized on public.ape_records;
drop policy if exists ape_records_delete_authorized on public.ape_records;
create policy ape_records_select_scoped on public.ape_records for select using (public.can_see_pilot(pilot_id));
create policy ape_records_insert_scoped on public.ape_records for insert with check (public.is_safety_editor());
create policy ape_records_update_scoped on public.ape_records for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy ape_records_delete_scoped on public.ape_records for delete using (public.is_safety_editor());

drop policy if exists staneval_records_select_authorized on public.staneval_records;
drop policy if exists staneval_records_insert_authorized on public.staneval_records;
drop policy if exists staneval_records_update_authorized on public.staneval_records;
drop policy if exists staneval_records_delete_authorized on public.staneval_records;
create policy staneval_records_select_scoped on public.staneval_records for select using (public.can_see_pilot(pilot_id));
create policy staneval_records_insert_scoped on public.staneval_records for insert with check (public.is_safety_editor());
create policy staneval_records_update_scoped on public.staneval_records for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy staneval_records_delete_scoped on public.staneval_records for delete using (public.is_safety_editor());

drop policy if exists training_records_select_authorized on public.training_records;
drop policy if exists training_records_insert_authorized on public.training_records;
drop policy if exists training_records_update_authorized on public.training_records;
drop policy if exists training_records_delete_authorized on public.training_records;
create policy training_records_select_scoped on public.training_records for select using (public.can_see_pilot(pilot_id));
create policy training_records_insert_scoped on public.training_records for insert with check (public.is_safety_editor());
create policy training_records_update_scoped on public.training_records for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy training_records_delete_scoped on public.training_records for delete using (public.is_safety_editor());

drop policy if exists cbta_assessments_select_authorized on public.cbta_assessments;
drop policy if exists cbta_assessments_insert_authorized on public.cbta_assessments;
drop policy if exists cbta_assessments_update_authorized on public.cbta_assessments;
drop policy if exists cbta_assessments_delete_authorized on public.cbta_assessments;
create policy cbta_assessments_select_scoped on public.cbta_assessments for select using (public.can_see_pilot(pilot_id));
create policy cbta_assessments_insert_scoped on public.cbta_assessments for insert with check (public.is_safety_editor());
create policy cbta_assessments_update_scoped on public.cbta_assessments for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy cbta_assessments_delete_scoped on public.cbta_assessments for delete using (public.is_safety_editor());

-- ---------------------------------------------------------------------------
-- Flying records: everyone who can see the person may read; only the wing
-- admin of that pilot's wing (or the super admin) may change.
-- ---------------------------------------------------------------------------
drop policy if exists flights_select_authorized on public.flights;
drop policy if exists flights_insert_authorized on public.flights;
drop policy if exists flights_update_authorized on public.flights;
drop policy if exists flights_delete_authorized on public.flights;
create policy flights_select_scoped on public.flights for select using (public.can_see_pilot(pilot_id));
create policy flights_insert_scoped on public.flights for insert with check (public.can_edit_flying(pilot_id));
create policy flights_update_scoped on public.flights for update using (public.can_edit_flying(pilot_id)) with check (public.can_edit_flying(pilot_id));
create policy flights_delete_scoped on public.flights for delete using (public.can_edit_flying(pilot_id));

drop policy if exists currency_items_select_authorized on public.currency_items;
drop policy if exists currency_items_insert_authorized on public.currency_items;
drop policy if exists currency_items_update_authorized on public.currency_items;
drop policy if exists currency_items_delete_authorized on public.currency_items;
create policy currency_items_select_scoped on public.currency_items for select using (public.can_see_pilot(pilot_id));
create policy currency_items_insert_scoped on public.currency_items for insert with check (public.can_edit_flying(pilot_id));
create policy currency_items_update_scoped on public.currency_items for update using (public.can_edit_flying(pilot_id)) with check (public.can_edit_flying(pilot_id));
create policy currency_items_delete_scoped on public.currency_items for delete using (public.can_edit_flying(pilot_id));

-- Acknowledging an alert: anyone who can see that person's alerts.
drop policy if exists alert_acknowledgements_select_authorized on public.alert_acknowledgements;
drop policy if exists alert_acknowledgements_insert_authorized on public.alert_acknowledgements;
drop policy if exists alert_acknowledgements_delete_authorized on public.alert_acknowledgements;
create policy alert_acknowledgements_select_scoped on public.alert_acknowledgements for select using (public.can_see_pilot(pilot_id));
create policy alert_acknowledgements_insert_scoped on public.alert_acknowledgements for insert with check (public.can_see_pilot(pilot_id));
create policy alert_acknowledgements_delete_scoped on public.alert_acknowledgements for delete using (public.can_see_pilot(pilot_id));

-- ---------------------------------------------------------------------------
-- Written exams (question bank incl. the answer key, assignments, attempts):
-- super admin and safety office only. Wing admins never see the exam tables.
-- ---------------------------------------------------------------------------
drop policy if exists exam_sets_select_authorized on public.exam_sets;
drop policy if exists exam_sets_insert_authorized on public.exam_sets;
drop policy if exists exam_sets_update_authorized on public.exam_sets;
drop policy if exists exam_sets_delete_authorized on public.exam_sets;
create policy exam_sets_select_scoped on public.exam_sets for select using (public.is_safety_editor());
create policy exam_sets_insert_scoped on public.exam_sets for insert with check (public.is_safety_editor());
create policy exam_sets_update_scoped on public.exam_sets for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy exam_sets_delete_scoped on public.exam_sets for delete using (public.is_safety_editor());

drop policy if exists exam_questions_select_authorized on public.exam_questions;
drop policy if exists exam_questions_insert_authorized on public.exam_questions;
drop policy if exists exam_questions_update_authorized on public.exam_questions;
drop policy if exists exam_questions_delete_authorized on public.exam_questions;
create policy exam_questions_select_scoped on public.exam_questions for select using (public.is_safety_editor());
create policy exam_questions_insert_scoped on public.exam_questions for insert with check (public.is_safety_editor());
create policy exam_questions_update_scoped on public.exam_questions for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy exam_questions_delete_scoped on public.exam_questions for delete using (public.is_safety_editor());

drop policy if exists exam_options_select_authorized on public.exam_options;
drop policy if exists exam_options_insert_authorized on public.exam_options;
drop policy if exists exam_options_update_authorized on public.exam_options;
drop policy if exists exam_options_delete_authorized on public.exam_options;
create policy exam_options_select_scoped on public.exam_options for select using (public.is_safety_editor());
create policy exam_options_insert_scoped on public.exam_options for insert with check (public.is_safety_editor());
create policy exam_options_update_scoped on public.exam_options for update using (public.is_safety_editor()) with check (public.is_safety_editor());
create policy exam_options_delete_scoped on public.exam_options for delete using (public.is_safety_editor());

drop policy if exists exam_assignments_select_authorized on public.exam_assignments;
drop policy if exists exam_assignments_insert_authorized on public.exam_assignments;
drop policy if exists exam_assignments_delete_authorized on public.exam_assignments;
create policy exam_assignments_select_scoped on public.exam_assignments for select using (public.is_safety_editor());
create policy exam_assignments_insert_scoped on public.exam_assignments for insert with check (public.is_safety_editor());
create policy exam_assignments_delete_scoped on public.exam_assignments for delete using (public.is_safety_editor());

drop policy if exists exam_attempts_select_authorized on public.exam_attempts;
drop policy if exists exam_attempts_delete_authorized on public.exam_attempts;
create policy exam_attempts_select_scoped on public.exam_attempts for select using (public.is_safety_editor());
create policy exam_attempts_delete_scoped on public.exam_attempts for delete using (public.is_safety_editor());

-- ---------------------------------------------------------------------------
-- Shared lookup tables (ranks, aircraft types, crew roles): every staff role.
-- ---------------------------------------------------------------------------
drop policy if exists ranks_select_authorized on public.ranks;
create policy ranks_select_scoped on public.ranks for select using (public.has_staff_access());
drop policy if exists aircraft_types_select_authorized on public.aircraft_types;
create policy aircraft_types_select_scoped on public.aircraft_types for select using (public.has_staff_access());
drop policy if exists crew_roles_select_authorized on public.crew_roles;
create policy crew_roles_select_scoped on public.crew_roles for select using (public.has_staff_access());

-- ---------------------------------------------------------------------------
-- APE medical certificates: a private file store, readable and writable by the
-- safety office and super admin ONLY (wing admins see the APE status, never
-- the medical document).
-- ---------------------------------------------------------------------------
alter table public.ape_records
  add column certificate_path text,
  add column certificate_name text;

insert into storage.buckets (id, name, public)
values ('ape-certificates', 'ape-certificates', false)
on conflict (id) do nothing;

create policy ape_certificates_select on storage.objects for select
  using (bucket_id = 'ape-certificates' and public.is_safety_editor());
create policy ape_certificates_insert on storage.objects for insert
  with check (bucket_id = 'ape-certificates' and public.is_safety_editor());
create policy ape_certificates_update on storage.objects for update
  using (bucket_id = 'ape-certificates' and public.is_safety_editor());
create policy ape_certificates_delete on storage.objects for delete
  using (bucket_id = 'ape-certificates' and public.is_safety_editor());
