/**
 * Date helpers pinned to Philippine time. The app runs on Vercel (UTC) but
 * the wing works in Manila time (UTC+8), so "today" -- and therefore whether
 * an APE, currency item or qualification has expired -- has to be decided
 * against the Manila calendar, not the server's. Otherwise everything flips
 * eight hours late (at 8:00 AM Manila instead of midnight).
 *
 * All stored dates are date-only strings (YYYY-MM-DD). Comparisons here work
 * on whole calendar days so time-of-day never leaks in.
 */

export const APP_TIME_ZONE = "Asia/Manila";

const DAY_MS = 86_400_000;

/** Today's calendar date in Manila, as YYYY-MM-DD. */
export function todayInManila(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayNumber(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS);
}

/** Whole calendar days from today (Manila) until `iso`. Negative = in the
 * past; 0 = today. */
export function daysUntilDate(iso: string, now: Date = new Date()): number {
  return dayNumber(iso) - dayNumber(todayInManila(now));
}

/** `iso` plus `days` calendar days, as YYYY-MM-DD (no timezone drift). */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First and last day of the current Manila month, as YYYY-MM-DD. */
export function currentMonthBoundsInManila(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const [y, m] = todayInManila(now).split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** Formats a date-only string (YYYY-MM-DD) without any timezone shifting. */
export function formatIsoDate(
  iso: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });
}

/** Formats a full timestamp (e.g. submitted_at) as a Manila calendar date. */
export function formatManilaDate(
  timestamp: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  return new Date(timestamp).toLocaleDateString("en-US", { ...options, timeZone: APP_TIME_ZONE });
}

/** The Manila calendar date (YYYY-MM-DD) of a full timestamp. */
export function manilaDateOf(timestamp: string): string {
  return todayInManila(new Date(timestamp));
}
