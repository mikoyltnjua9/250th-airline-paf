-- =============================================================================
-- 250th PAF Wing Safety Dashboard — Phase 1: roles, profiles, permission layer
-- =============================================================================
-- Scope: just what Phase 1 (auth + app shell) needs. Domain tables (pilots,
-- licenses, qualifications, etc.) are added in later migrations as each
-- phase is built, per the agreed build order.
--
-- Security model:
--   - Every table gets RLS enabled the moment it's created — never bolted on
--     later.
--   - Access requires BOTH: (a) profiles.role_code = 'super_admin', AND
--     (b) the session's Authenticator Assurance Level is 'aal2' (i.e. the
--     user has completed TOTP 2FA this session). A logged-in-but-not-yet-
--     2FA-verified session (aal1) can do nothing except read its own
--     profile row (needed to render the "set up 2FA" screen) and talk to
--     Supabase Auth's own MFA enrollment endpoints (which aren't gated by
--     table RLS at all).
--   - `public.is_super_admin()` / `public.has_mfa()` are small SECURITY
--     DEFINER helpers so RLS policies stay one-liners everywhere else, and
--     so this is the ONE place that encodes "what counts as authorized" —
--     the permissions layer the client asked for. Adding a narrower role
--     later (e.g. "data_entry") means adding a row to `roles` and updating
--     these helpers / adding new ones — not rewriting policies on every
--     table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- roles: lookup table, not a Postgres enum, so adding a role later is an
-- INSERT, not a schema migration.
-- ---------------------------------------------------------------------------
create table public.roles (
  code        text primary key,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.roles enable row level security;

insert into public.roles (code, label, description) values
  ('super_admin', 'Super Admin', 'Full access to everything: view, create, edit, delete, manage users.');

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users. Holds the role assignment used for RLS.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role_code  text not null references public.roles(code) default 'super_admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create index profiles_role_code_idx on public.profiles(role_code);

-- ---------------------------------------------------------------------------
-- updated_at helper — reused by every future table with an updated_at column.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- new-user provisioning: whenever an account is created (always by a
-- super_admin via the Admin API — no public self-signup), auto-create the
-- matching profile row. full_name is passed in via user_metadata at
-- creation time.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role_code', 'super_admin')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Permission layer helpers (SECURITY DEFINER: these read `profiles` and/or
-- the JWT directly, bypassing RLS themselves, so they don't recurse into
-- the very policies that call them).
-- ---------------------------------------------------------------------------
create or replace function public.current_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_code from public.profiles where id = auth.uid();
$$;

-- True once the current session has completed TOTP 2FA (Authenticator
-- Assurance Level 2). A fresh password-only login is aal1.
create or replace function public.has_mfa()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt()->>'aal'), 'aal1') = 'aal2';
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select public.current_role_code() = 'super_admin';
$$;

-- Single gate every RLS policy on every domain table should use.
create or replace function public.is_authorized()
returns boolean
language sql
stable
as $$
  select public.is_super_admin() and public.has_mfa();
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- roles: readable by any authorized (2FA-verified super_admin) user; nobody
-- writes to it through the app in v1 (managed via migrations).
create policy roles_select_authorized
  on public.roles for select
  using (public.is_authorized());

-- profiles:
--   - a user may always read their own row, even pre-2FA, so the app can
--     show their name on the "set up 2FA" screen.
--   - authorized super_admins may read every profile (user management).
--   - only authorized super_admins may create/update/delete profiles
--     (account management happens through the admin UI / Admin API).
create policy profiles_select_self_or_authorized
  on public.profiles for select
  using (auth.uid() = id or public.is_authorized());

create policy profiles_insert_authorized
  on public.profiles for insert
  with check (public.is_authorized());

create policy profiles_update_authorized
  on public.profiles for update
  using (public.is_authorized())
  with check (public.is_authorized());

create policy profiles_delete_authorized
  on public.profiles for delete
  using (public.is_authorized());
