-- One-off cleanup: the training_records seed migration got run twice,
-- producing an exact duplicate of every row (same pilot/type/date/status,
-- different id and created_at). Removes the duplicate half, keeping one
-- copy of each.

delete from public.training_records a
using public.training_records b
where a.id < b.id
  and a.pilot_id = b.pilot_id
  and a.training_type = b.training_type
  and a.training_date = b.training_date
  and a.status = b.status;
