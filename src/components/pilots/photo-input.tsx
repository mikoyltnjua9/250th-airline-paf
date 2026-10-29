"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { shrinkImage } from "@/lib/image/shrink";

const SHRINK_ABOVE = 1.5 * 1024 * 1024;

/**
 * The person's photo. A big phone picture is shrunk in the browser first, so
 * it gets through whatever its size (the hosting platform refuses request
 * bodies above ~4.5 MB).
 */
export function PhotoInput() {
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    const file = e.target.files?.[0];
    if (!file || file.size <= SHRINK_ABOVE) return;
    try {
      const smaller = await shrinkImage(file);
      const dt = new DataTransfer();
      dt.items.add(smaller);
      e.target.files = dt.files;
    } catch {
      setMessage("Couldn't prepare that photo. Please choose a smaller one.");
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <Input
        id="photo"
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="max-w-xs"
      />
      {message && <p className="text-xs text-red-600 dark:text-red-400">{message}</p>}
    </div>
  );
}
