"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reactivatePilot } from "@/app/(dashboard)/personnel/actions";

/** Sits inside a whole-row <Link> on the Directory's Deactivated tab, so a
 * click here must never also trigger the row's own navigation. */
export function ReactivatePilotButton({ pilotId }: { pilotId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(() => reactivatePilot(pilotId));
      }}
    >
      {isPending ? "Reactivating…" : "Reactivate"}
    </Button>
  );
}
