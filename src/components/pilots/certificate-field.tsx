"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/image/shrink";
import { CERTIFICATE_MAX_BYTES, CERTIFICATE_MAX_MB, CERTIFICATE_TYPES } from "@/lib/ape/certificate-limits";

const BUCKET = "ape-certificates";
const SHRINK_ABOVE = 6 * 1024 * 1024;

/**
 * "Medical certificate" attachment for an APE record. The file goes straight
 * from the browser to private storage the moment it's chosen (so its size
 * isn't held back by the web server's request limit); the form then only
 * carries where it was put, and the server checks it again on save. When a
 * certificate is already on file, shows it and lets the user replace it or
 * remove it.
 */
export function CertificateField({
  pilotId,
  existingName,
}: {
  pilotId: string;
  existingName?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ path: string; name: string; size: number } | null>(null);

  // Blocks Save while the upload is still going.
  function setBusy(busy: boolean) {
    setUploading(busy);
    input.current?.setCustomValidity(busy ? "Please wait for the certificate to finish uploading." : "");
  }

  async function discardUploaded() {
    if (!uploaded) return;
    const old = uploaded.path;
    setUploaded(null);
    await createClient().storage.from(BUCKET).remove([old]);
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    await discardUploaded();
    let file = e.target.files?.[0];
    if (!file) return;
    const kind = CERTIFICATE_TYPES[file.type];
    if (!kind) {
      setMessage("Please choose a PDF, JPG or PNG file.");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      if (file.type.startsWith("image/") && file.size > SHRINK_ABOVE) {
        try {
          file = await shrinkImage(file, 3000);
        } catch {
          /* keep the original; the size check below decides */
        }
      }
      if (file.size > CERTIFICATE_MAX_BYTES) {
        setMessage(`That file is over ${CERTIFICATE_MAX_MB} MB. Please choose a smaller scan or photo.`);
        e.target.value = "";
        return;
      }
      const ext = CERTIFICATE_TYPES[file.type]?.ext ?? kind.ext;
      const path = `${pilotId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient()
        .storage.from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setMessage(`Couldn't upload that file: ${error.message}`);
        e.target.value = "";
        return;
      }
      setUploaded({ path, name: file.name.slice(0, 120), size: file.size });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="certificate">Medical certificate (optional)</Label>
      {existingName && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            On file: <span className="font-medium">{existingName}</span>
          </span>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" name="remove_certificate" />
            Remove it
          </label>
        </div>
      )}
      {/* No name: the file itself never rides in the form, only where it went. */}
      <input
        ref={input}
        id="certificate"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={onChange}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
      />
      {uploaded && (
        <>
          <input type="hidden" name="certificate_path" value={uploaded.path} />
          <input type="hidden" name="certificate_name" value={uploaded.name} />
        </>
      )}
      <p className="text-xs text-muted-foreground">
        PDF, JPG or PNG, up to {CERTIFICATE_MAX_MB} MB. {existingName ? "Choosing a file replaces the one on file. " : ""}
        Only the Safety Office and super admins can open it.
      </p>
      {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
      {uploaded && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Uploaded: {uploaded.name} ({(uploaded.size / 1024 / 1024).toFixed(1)} MB). It is attached when you save.
        </p>
      )}
      {message && <p className="text-xs text-red-600 dark:text-red-400">{message}</p>}
    </div>
  );
}
