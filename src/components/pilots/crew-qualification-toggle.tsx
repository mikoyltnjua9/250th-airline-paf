"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { setCrewQualification } from "@/app/(dashboard)/personnel/[id]/crew-qualifications/actions";

/** One-click toggle badge -- "Qualified"/"Not Qualified" -- for a single
 * crew role. No confirm dialog: unlike delete, this is fully reversible
 * with another click, so the friction of ConfirmActionButton isn't earned
 * here. */
export function CrewQualificationToggle({
  pilotId,
  roleCode,
  aircraftTypeCode,
  qualified,
  readOnly = false,
}: {
  pilotId: string;
  roleCode: string;
  /** The aircraft this status is for; null for a pilot with none on file. */
  aircraftTypeCode: string | null;
  qualified: boolean;
  /** For accounts that may look but not change (shown as a plain badge). */
  readOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (readOnly) {
    return (
      <Badge
        className={
          qualified
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        }
      >
        {qualified ? "Qualified" : "Not Qualified"}
      </Badge>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setCrewQualification(pilotId, roleCode, aircraftTypeCode, !qualified))}
      className="disabled:opacity-60"
      title="Click to toggle"
    >
      <Badge
        className={
          qualified
            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-muted text-muted-foreground hover:bg-muted/70"
        }
      >
        {isPending ? "Updating…" : qualified ? "Qualified" : "Not Qualified"}
      </Badge>
    </button>
  );
}
