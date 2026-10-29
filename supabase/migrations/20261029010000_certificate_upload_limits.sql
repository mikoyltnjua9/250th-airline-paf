-- =============================================================================
-- Client request (Oct 29): raise the file upload capacity.
-- Medical certificates now go straight from the browser to storage (no longer
-- held to the web server's ~4.5 MB request limit), up to 20 MB. The bucket
-- itself enforces that, and only PDF/JPG/PNG are accepted, so the rule holds
-- even for a request that skips the form. Idempotent.
-- =============================================================================

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'ape-certificates';
