import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";
import { CERTIFICATE_BUCKET } from "@/lib/ape/certificate";

/**
 * Opens an APE record's medical certificate. The file is private; this checks
 * who is asking, then hands the browser a link that works for one minute.
 * Only the safety office and super admins may open it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  const { id, recordId } = await params;

  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "ape:certificate")) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data: record } = await supabase
    .from("ape_records")
    .select("certificate_path")
    .eq("id", recordId)
    .eq("pilot_id", id)
    .maybeSingle();
  if (!record?.certificate_path) return new Response("No certificate on file", { status: 404 });

  const { data, error } = await supabase.storage
    .from(CERTIFICATE_BUCKET)
    .createSignedUrl(record.certificate_path, 60);
  if (error || !data?.signedUrl) return new Response("Certificate unavailable", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "no-store" },
  });
}
