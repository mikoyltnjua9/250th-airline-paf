-- =============================================================================
-- Written exams (client request, 2026-09): maintenance personnel and cabin
-- crew take the 2026 Stan Eval question banks inside the app. Pass mark 85%,
-- retakes allowed, no time limit. A submitted attempt writes a Pass/Fail
-- StanEval record onto the person's profile.
--
-- Security design:
--   * Examinees get a new `examinee` role with NO RLS policies on any table.
--     They can't read a row of anything directly -- every exam action runs in
--     a server action (service-role client) that first verifies the signed-in
--     user, their linked personnel record, and that the exam is assigned to
--     them. So exam_options.is_correct (the answer key) can never reach a
--     browser: the app never selects it for an examinee, and RLS would block
--     it even if it did.
--   * Admin policies use the same is_authorized() gate as every other table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Examinee role + link from an account to the personnel record it represents.
-- ---------------------------------------------------------------------------
insert into public.roles (code, label, description) values
  ('examinee', 'Examinee', 'Maintenance / cabin-crew personnel who take assigned written exams. No access to the wing dashboard.');

alter table public.profiles
  add column personnel_id uuid references public.pilots(id) on delete set null;

-- One account per person (an account can't be shared between two records).
create unique index profiles_personnel_id_key
  on public.profiles(personnel_id) where personnel_id is not null;

-- Maintenance skill level (3rd / 5th / 7th). Null for pilots and everyone
-- the skill-level scheme doesn't apply to.
alter table public.pilots
  add column skill_level text check (skill_level in ('3rd', '5th', '7th'));

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------
create table public.exam_sets (
  id          uuid primary key default gen_random_uuid(),
  code        text,                       -- course code from the file, e.g. 43131
  title       text not null,              -- e.g. "Aircraft Maintenance C295"
  category    text not null,              -- e.g. "Aircraft General"
  skill_level text check (skill_level in ('3rd', '5th', '7th')),
  audience    text not null default 'maintenance' check (audience in ('maintenance', 'cabin_crew')),
  pass_mark   numeric(5,2) not null default 85,
  active      boolean not null default true,
  source_file text unique,                -- which client file this came from
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.exam_questions (
  id          uuid primary key default gen_random_uuid(),
  exam_set_id uuid not null references public.exam_sets(id) on delete cascade,
  position    int  not null,
  body        text not null,
  reference   text,                       -- manual citation, where the source gives one
  -- 'needs_review' = the source file had no / more than one marked answer, or
  -- a broken option list. Held out of scoring until someone fixes it.
  status      text not null default 'ok' check (status in ('ok', 'needs_review')),
  review_note text,
  created_at  timestamptz not null default now(),
  unique (exam_set_id, position)
);

create table public.exam_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exam_questions(id) on delete cascade,
  position    int  not null,
  body        text not null,
  is_correct  boolean not null default false,   -- THE ANSWER KEY. Server-side only.
  unique (question_id, position)
);

create index exam_questions_set_idx on public.exam_questions(exam_set_id);
create index exam_options_question_idx on public.exam_options(question_id);

create trigger exam_sets_set_updated_at
  before update on public.exam_sets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Which person is assigned which exam (not everyone takes every exam --
-- it depends on their skill), and their attempts.
-- ---------------------------------------------------------------------------
create table public.exam_assignments (
  id           uuid primary key default gen_random_uuid(),
  personnel_id uuid not null references public.pilots(id) on delete cascade,
  exam_set_id  uuid not null references public.exam_sets(id) on delete cascade,
  assigned_by  uuid references auth.users(id) on delete set null,
  assigned_at  timestamptz not null default now(),
  unique (personnel_id, exam_set_id)
);

create table public.exam_attempts (
  id                 uuid primary key default gen_random_uuid(),
  personnel_id       uuid not null references public.pilots(id) on delete cascade,
  exam_set_id        uuid not null references public.exam_sets(id) on delete restrict,
  started_at         timestamptz not null default now(),
  submitted_at       timestamptz,
  -- Order shown to this person, frozen when the attempt starts so a refresh
  -- or a resume after the inactivity timeout shows the exact same layout:
  -- [{ "q": "<question id>", "opts": ["<option id>", ...] }, ...]
  question_order     jsonb not null,
  -- Autosaved as they go: { "<question id>": "<option id>" }
  answers            jsonb not null default '{}'::jsonb,
  scored_total       int,
  scored_correct     int,
  percent            numeric(5,2),
  passed             boolean,
  staneval_record_id uuid references public.staneval_records(id) on delete set null
);

create index exam_assignments_personnel_idx on public.exam_assignments(personnel_id);
create index exam_attempts_personnel_idx on public.exam_attempts(personnel_id, exam_set_id);

-- ---------------------------------------------------------------------------
-- RLS: on everywhere, admin-only. Deliberately no examinee policies.
-- ---------------------------------------------------------------------------
alter table public.exam_sets        enable row level security;
alter table public.exam_questions   enable row level security;
alter table public.exam_options     enable row level security;
alter table public.exam_assignments enable row level security;
alter table public.exam_attempts    enable row level security;

create policy exam_sets_select_authorized on public.exam_sets for select using (public.is_authorized());
create policy exam_sets_insert_authorized on public.exam_sets for insert with check (public.is_authorized());
create policy exam_sets_update_authorized on public.exam_sets for update using (public.is_authorized()) with check (public.is_authorized());
create policy exam_sets_delete_authorized on public.exam_sets for delete using (public.is_authorized());

create policy exam_questions_select_authorized on public.exam_questions for select using (public.is_authorized());
create policy exam_questions_insert_authorized on public.exam_questions for insert with check (public.is_authorized());
create policy exam_questions_update_authorized on public.exam_questions for update using (public.is_authorized()) with check (public.is_authorized());
create policy exam_questions_delete_authorized on public.exam_questions for delete using (public.is_authorized());

create policy exam_options_select_authorized on public.exam_options for select using (public.is_authorized());
create policy exam_options_insert_authorized on public.exam_options for insert with check (public.is_authorized());
create policy exam_options_update_authorized on public.exam_options for update using (public.is_authorized()) with check (public.is_authorized());
create policy exam_options_delete_authorized on public.exam_options for delete using (public.is_authorized());

create policy exam_assignments_select_authorized on public.exam_assignments for select using (public.is_authorized());
create policy exam_assignments_insert_authorized on public.exam_assignments for insert with check (public.is_authorized());
create policy exam_assignments_delete_authorized on public.exam_assignments for delete using (public.is_authorized());

create policy exam_attempts_select_authorized on public.exam_attempts for select using (public.is_authorized());
create policy exam_attempts_delete_authorized on public.exam_attempts for delete using (public.is_authorized());
