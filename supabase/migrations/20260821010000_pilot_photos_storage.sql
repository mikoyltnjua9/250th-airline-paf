-- =============================================================================
-- Real pilot photo upload, replacing the initials-only placeholder avatar.
-- Public bucket -- photos need to be viewable on the unauthenticated
-- /verify/[token] page, same trust model already used for that page's
-- unguessable verify token (public but not enumerable/guessable, since the
-- file path is keyed by the pilot's uuid).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('pilot-photos', 'pilot-photos', true)
on conflict (id) do nothing;

create policy pilot_photos_public_read
  on storage.objects for select
  using (bucket_id = 'pilot-photos');

create policy pilot_photos_authorized_insert
  on storage.objects for insert
  with check (bucket_id = 'pilot-photos' and public.is_authorized());

create policy pilot_photos_authorized_update
  on storage.objects for update
  using (bucket_id = 'pilot-photos' and public.is_authorized());

create policy pilot_photos_authorized_delete
  on storage.objects for delete
  using (bucket_id = 'pilot-photos' and public.is_authorized());
