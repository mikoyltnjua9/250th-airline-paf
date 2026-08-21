"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Re-runs the current route's server components to pull fresh data,
 * without a full page reload (Next.js `router.refresh()`). Pairs with the
 * header's "Last updated" timestamp -- that timestamp is set at render
 * time, so a refresh here is what actually advances it. */
export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Refresh"
      aria-label="Refresh"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
    >
      <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
    </button>
  );
}
