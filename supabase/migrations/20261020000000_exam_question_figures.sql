-- A question can carry a picture (e.g. the holding-pattern entry-sector figure).
-- The file lives in a private bucket; the exam screen reads it through the app,
-- which checks the person is actually sitting an exam that contains it.
alter table public.exam_questions
  add column if not exists image_path text;

insert into storage.buckets (id, name, public)
values ('exam-figures', 'exam-figures', false)
on conflict (id) do nothing;

drop policy if exists exam_figures_select on storage.objects;
drop policy if exists exam_figures_insert on storage.objects;
drop policy if exists exam_figures_update on storage.objects;
drop policy if exists exam_figures_delete on storage.objects;

create policy exam_figures_select on storage.objects for select
  using (bucket_id = 'exam-figures' and public.is_safety_editor());
create policy exam_figures_insert on storage.objects for insert
  with check (bucket_id = 'exam-figures' and public.is_safety_editor());
create policy exam_figures_update on storage.objects for update
  using (bucket_id = 'exam-figures' and public.is_safety_editor());
create policy exam_figures_delete on storage.objects for delete
  using (bucket_id = 'exam-figures' and public.is_safety_editor());
