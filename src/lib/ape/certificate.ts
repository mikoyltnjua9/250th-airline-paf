import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CERTIFICATE_MAX_BYTES, CERTIFICATE_MAX_MB, CERTIFICATE_TYPES } from "@/lib/ape/certificate-limits";

/** Private bucket; only the safety office and super admin can read or write it. */
export const CERTIFICATE_BUCKET = "ape-certificates";

const UUID = /^[0-9a-f-]{36}$/;

/**
 * The file is uploaded straight from the browser to storage (so its size isn't
 * held back by the hosting platform's ~4.5 MB request limit); the form then
 * only carries where it was put. This is that pair, or null when no file was
 * chosen.
 */
export function certificateFromForm(formData: FormData): { path: string; name: string } | null {
  const path = String(formData.get("certificate_path") ?? "").trim();
  if (!path) return null;
  return { path, name: String(formData.get("certificate_name") ?? "").trim().slice(0, 120) || "certificate" };
}

/**
 * Checks what the browser uploaded before the record points at it: it has to
 * sit in this pilot's folder, be a real PDF/JPG/PNG (judged by its contents,
 * not the name or the type the browser claimed) and be within the size limit.
 * Returns a readable reason it can't be used, or null if it's fine.
 */
export async function checkUploadedCertificate(
  supabase: SupabaseClient,
  pilotId: string,
  path: string,
): Promise<string | null> {
  const match = UUID.test(pilotId) && path.match(new RegExp(`^${pilotId}/[0-9a-f-]{36}\\.(pdf|jpg|png)$`));
  if (!match) return "That medical certificate upload isn't valid. Please choose the file again.";
  const kind = Object.values(CERTIFICATE_TYPES).find((t) => t.ext === match[1])!;

  const { data } = await supabase.storage.from(CERTIFICATE_BUCKET).createSignedUrl(path, 60);
  if (!data) return "The uploaded medical certificate couldn't be found. Please choose the file again.";

  // Read just the start of the file for its signature, and its total size from the headers.
  // (Reads the whole 8-byte answer rather than cancelling a stream: Next's patched
  // fetch can stall on an abandoned body.)
  const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-7" }, cache: "no-store" });
  if (!res.ok) return "The uploaded medical certificate couldn't be read. Please choose the file again.";
  const total = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length"));
  const head = new Uint8Array(await res.arrayBuffer()).slice(0, 8);

  if (total > CERTIFICATE_MAX_BYTES) {
    await removeCertificate(supabase, path);
    return `The medical certificate is too large (${CERTIFICATE_MAX_MB} MB at most).`;
  }
  if (!kind.magic.every((byte, i) => head[i] === byte)) {
    await removeCertificate(supabase, path);
    return "That file doesn't look like a real PDF, JPG or PNG. Please upload the original document.";
  }
  return null;
}

/** Best-effort removal (a leftover file is harmless; it's private). */
export async function removeCertificate(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(CERTIFICATE_BUCKET).remove([path]);
}
