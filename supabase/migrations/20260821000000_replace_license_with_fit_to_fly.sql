-- =============================================================================
-- Licensing removed at the client's request, replaced by a simple
-- fit-to-fly / unfit-to-fly flag on the pilot record itself. The
-- "Scan to Verify" QR moves from licenses.public_verify_token to
-- pilots.public_verify_token, so it no longer depends on licensing
-- existing at all -- every pilot gets one automatically.
--
-- The licenses table and its existing data are left in place, untouched
-- and unused -- non-destructive, same approach as the earlier
-- unit_section removal. Nothing reads or writes it going forward.
--
-- fit_to_fly defaults to true for existing rows -- a placeholder
-- assumption, not a real assessment. Whoever owns real pilot data should
-- review/set this per pilot once this ships.
-- =============================================================================

alter table public.pilots
  add column fit_to_fly boolean not null default true,
  add column public_verify_token uuid not null default gen_random_uuid() unique;

create index pilots_public_verify_token_idx on public.pilots(public_verify_token);

-- pilots wasn't previously in the audited-table list -- fit_to_fly is
-- safety-critical the same way license status used to be, so the whole
-- table now gets the same generic change-logging as licenses/
-- qualifications/ape_records/staneval_records already have. Side effect:
-- name/rank/AFSN/position edits start being logged too, which is a
-- reasonable byproduct, not something to avoid.
create trigger pilots_audit
  after insert or update or delete on public.pilots
  for each row execute function public.audit_log_row_changes();
