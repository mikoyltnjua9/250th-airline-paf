"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Shows the message queued by `flash()` ("<id>|<message>") once, then clears
 * the cookie so a refresh doesn't show it again. The id keeps two identical
 * messages in a row (saving twice) from being mistaken for one.
 */
export function FlashToast({ value }: { value?: string }) {
  useEffect(() => {
    if (!value) return;
    const split = value.indexOf("|");
    if (split < 0) return;
    const id = value.slice(0, split);
    let message: string;
    try {
      message = decodeURIComponent(value.slice(split + 1));
    } catch {
      return;
    }
    toast.success(message, { id });
    document.cookie = "flash=; Max-Age=0; path=/; SameSite=Lax";
  }, [value]);

  return null;
}
