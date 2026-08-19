import { cn } from "@/lib/utils";
import type { QualStatus } from "@/lib/mock/dashboard";

const STATUS_STYLES: Record<QualStatus, string> = {
  current: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  expiring_soon: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  in_training: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
};

const STATUS_LABELS: Record<QualStatus, string> = {
  current: "Current",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  in_training: "In Training",
};

export function StatusBadge({ status }: { status: QualStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
