"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";

const MAX_BYTES = 4 * 1024 * 1024;
const SHRINK_ABOVE = 1.5 * 1024 * 1024;
const MAX_SIDE = 2000;

/** Photos from a phone are often 5-10 MB: shrink them in the browser. */
async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * "Medical certificate" attachment for an APE record. When a certificate is
 * already on file, shows it and lets the user replace it or remove it.
 */
export function CertificateField({ existingName }: { existingName?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    setPicked(null);
    let file = e.target.files?.[0];
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setMessage("Please choose a PDF, JPG or PNG file.");
      e.target.value = "";
      return;
    }
    if (file.type.startsWith("image/") && file.size > SHRINK_ABOVE) {
      try {
        file = await shrinkImage(file);
        const dt = new DataTransfer();
        dt.items.add(file);
        e.target.files = dt.files;
      } catch {
        /* keep the original; the size check below decides */
      }
    }
    if (file.size > MAX_BYTES) {
      setMessage("That file is over 4 MB. Please choose a smaller scan or photo.");
      e.target.value = "";
      return;
    }
    setPicked(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
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
      <input
        ref={input}
        id="certificate"
        name="certificate"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={onChange}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
      />
      <p className="text-xs text-muted-foreground">
        PDF, JPG or PNG, up to 4 MB. {existingName ? "Choosing a file replaces the one on file. " : ""}
        Only the Safety Office and super admins can open it.
      </p>
      {picked && <p className="text-xs text-emerald-700 dark:text-emerald-400">Ready to upload: {picked}</p>}
      {message && <p className="text-xs text-red-600 dark:text-red-400">{message}</p>}
    </div>
  );
}
