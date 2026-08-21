import { cn } from "@/lib/utils";
import type { DutyBand, DutyStatus } from "@/lib/pilots/queries";

const BAND_LABELS: Record<DutyBand, string> = {
  optimal: "Optimal",
  normal: "Normal",
  high: "High",
};

const BAND_TEXT_STYLES: Record<DutyBand, string> = {
  optimal: "text-emerald-600 dark:text-emerald-400",
  normal: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

/**
 * Half-circle speedometer, three equal bands (Optimal/Normal/High — the
 * client's own thirds-of-the-cap split, confirmed 2026-08-22). "Duty days"
 * is derived from real flight dates this month (see getDutyStatus), not a
 * fabricated figure — there's no duty-roster tracking in this system.
 */
export function DutyGauge({ status }: { status: DutyStatus }) {
  const { dutyDays, cap, band, periodLabel } = status;
  const fraction = Math.min(dutyDays / cap, 1);
  const needleAngle = 180 - fraction * 180;
  const needleTip = polarToCartesian(100, 100, 68, needleAngle);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 200 112" className="w-full max-w-[220px]">
        <path
          d={arcPath(100, 100, 80, 180, 120)}
          className="stroke-emerald-500/80 dark:stroke-emerald-400/80"
          strokeWidth={16}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={arcPath(100, 100, 80, 120, 60)}
          className="stroke-amber-500/80 dark:stroke-amber-400/80"
          strokeWidth={16}
          fill="none"
        />
        <path
          d={arcPath(100, 100, 80, 60, 0)}
          className="stroke-red-500/80 dark:stroke-red-400/80"
          strokeWidth={16}
          strokeLinecap="round"
          fill="none"
        />
        <line
          x1={100}
          y1={100}
          x2={needleTip.x}
          y2={needleTip.y}
          className="stroke-foreground"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={100} cy={100} r={6} className="fill-foreground" />
      </svg>

      <p className={cn("text-lg font-bold uppercase tracking-wide", BAND_TEXT_STYLES[band])}>
        {BAND_LABELS[band]}
      </p>
      <div className="space-y-0.5 text-center text-xs text-muted-foreground">
        <p>Duty Period: {periodLabel}</p>
        <p>
          Monthly Duty:{" "}
          <span className="font-medium text-foreground">
            {dutyDays} / {cap} Days
          </span>
        </p>
        <p>
          Workload: <span className={cn("font-medium", BAND_TEXT_STYLES[band])}>{BAND_LABELS[band].toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}
