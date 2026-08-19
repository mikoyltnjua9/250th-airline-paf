-- =============================================================================
-- Fix: created_by/updated_by/changed_by columns referenced auth.users(id)
-- with the default ON DELETE NO ACTION, which meant a super_admin account
-- could never be deleted once it had made even one change (audit_log, or
-- any created_by/updated_by, would block it permanently). Discovered while
-- cleaning up a test account during Phase 3 verification.
--
-- Audit history must survive account deletion (that's the point of an
-- audit trail — deleting your account shouldn't erase what you did), so
-- these go to SET NULL rather than CASCADE. The row stays; only the
-- identity link to a since-removed account is cleared.
-- =============================================================================

alter table public.audit_log
  drop constraint audit_log_changed_by_fkey,
  add constraint audit_log_changed_by_fkey
    foreign key (changed_by) references auth.users(id) on delete set null;

alter table public.pilots
  drop constraint pilots_created_by_fkey,
  add constraint pilots_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  drop constraint pilots_updated_by_fkey,
  add constraint pilots_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.licenses
  drop constraint licenses_created_by_fkey,
  add constraint licenses_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  drop constraint licenses_updated_by_fkey,
  add constraint licenses_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.qualifications
  drop constraint qualifications_created_by_fkey,
  add constraint qualifications_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  drop constraint qualifications_updated_by_fkey,
  add constraint qualifications_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.flights
  drop constraint flights_created_by_fkey,
  add constraint flights_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.ape_records
  drop constraint ape_records_created_by_fkey,
  add constraint ape_records_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  drop constraint ape_records_updated_by_fkey,
  add constraint ape_records_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.currency_items
  drop constraint currency_items_created_by_fkey,
  add constraint currency_items_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null,
  drop constraint currency_items_updated_by_fkey,
  add constraint currency_items_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;
