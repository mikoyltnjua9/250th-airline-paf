import { cn } from "@/lib/utils";
import type {
  FitnessReason,
  QualificationStatus,
  StanevalStatus,
  TrainingStatus,
} from "@/lib/types/pilot";

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

const FITNESS_REASON_SUFFIX: Record<FitnessReason, string> = {
  manual: "",
  ape_expired: " · APE expired",
  no_ape: " · No APE on file",
};

/** reason is only passed on internal screens. The public verify page and
 * printed ID card leave it off -- a stranger scanning a QR should learn
 * fit/unfit, not why. */
export function FitToFlyBadge({
  fitToFly,
  reason,
}: {
  fitToFly: boolean;
  reason?: FitnessReason | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        fitToFly
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
      )}
    >
      {fitToFly ? "Fit to Fly" : "Unfit to Fly" + (reason ? FITNESS_REASON_SUFFIX[reason] : "")}
    </span>
  );
}

const STANEVAL_STATUS_STYLES: Record<StanevalStatus, string> = {
  pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  fail: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

const STANEVAL_STATUS_LABELS: Record<StanevalStatus, string> = {
  pass: "Pass",
  fail: "Fail",
};

export function StanevalStatusBadge({ status }: { status: StanevalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STANEVAL_STATUS_STYLES[status],
      )}
    >
      {STANEVAL_STATUS_LABELS[status]}
    </span>
  );
}

const TRAINING_STATUS_STYLES: Record<TrainingStatus, string> = {
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  scheduled: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  completed: "Completed",
  scheduled: "Scheduled",
  overdue: "Overdue",
};

export function TrainingStatusBadge({ status }: { status: TrainingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TRAINING_STATUS_STYLES[status],
      )}
    >
      {TRAINING_STATUS_LABELS[status]}
    </span>
  );
}
