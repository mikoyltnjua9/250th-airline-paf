import { cn } from "@/lib/utils";
import type { QualificationStatus, LicenseStatus } from "@/lib/types/pilot";

const QUAL_STATUS_STYLES: Record<QualificationStatus, string> = {
  current: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  expiring_soon: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  in_training: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
};

const QUAL_STATUS_LABELS: Record<QualificationStatus, string> = {
  current: "Current",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  in_training: "In Training",
};

export function StatusBadge({ status }: { status: QualificationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        QUAL_STATUS_STYLES[status],
      )}
    >
      {QUAL_STATUS_LABELS[status]}
    </span>
  );
}

const LICENSE_STATUS_STYLES: Record<LicenseStatus, string> = {
  valid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  revoked: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  suspended: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
};

const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  valid: "Valid",
  expired: "Expired",
  revoked: "Revoked",
  suspended: "Suspended",
};

export function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        LICENSE_STATUS_STYLES[status],
      )}
    >
      {LICENSE_STATUS_LABELS[status]}
    </span>
  );
}
