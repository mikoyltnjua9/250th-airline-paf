import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Private bucket; only the safety office and super admin can read or write it. */
export const CERTIFICATE_BUCKET = "ape-certificates";

/**
 * 4 MB: the hosting platform rejects request bodies above ~4.5 MB, so a bigger
 * file could never arrive. (The form shrinks large phone photos first.)
 */
export const CERTIFICATE_MAX_BYTES = 4 * 1024 * 1024;

const TYPES: Record<string, { ext: string; magic: number[] }> = {
  "application/pdf": { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
};

/** The file the form sent, or null when the field was left empty. */
export function certificateFromForm(formData: FormData): File | null {
  const f = formData.get("certificate");
  return f instanceof File && f.size > 0 ? f : null;
}

/** A readable reason the file can't be accepted, or null if it's fine. */
export async function checkCertificate(file: File): Promise<string | null> {
  const kind = TYPES[file.type];
  if (!kind) return "The medical certificate must be a PDF, JPG or PNG file.";
  if (file.size > CERTIFICATE_MAX_BYTES) {
    return "The medical certificate is too large (4 MB at most). Try a smaller scan or photo.";
  }
  // Trust the contents, not the name or the type the browser claimed.
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!kind.magic.every((byte, i) => head[i] === byte)) {
    return "That file doesn't look like a real PDF, JPG or PNG. Please upload the original document.";
  }
  return null;
}

/** Stores the file under the pilot's folder with a random name. */
export async function storeCertificate(
  supabase: SupabaseClient,
  pilotId: string,
  file: File,
): Promise<{ path: string; name: string } | { error: string }> {
  const path = `${pilotId}/${randomUUID()}.${TYPES[file.type].ext}`;
  const { error } = await supabase.storage
    .from(CERTIFICATE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `Couldn't store the medical certificate: ${error.message}` };
  return { path, name: file.name.slice(0, 120) };
}

/** Best-effort removal (a leftover file is harmless; it's private). */
export async function removeCertificate(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(CERTIFICATE_BUCKET).remove([path]);
}
