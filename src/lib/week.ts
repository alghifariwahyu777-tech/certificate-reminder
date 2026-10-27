/**
 * ISO-week helpers pinned to Jakarta's calendar (WIB, UTC+7), used by the
 * weekly snapshot, the PIC update request and the management report.
 */
const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC-midnight Date for the Jakarta calendar day of `now`. */
export function jakartaDay(now = new Date()): Date {
  const s = new Date(now.getTime() + WIB_MS);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
}

/** 1 = Monday … 7 = Sunday, in Jakarta. */
export function jakartaWeekday(now = new Date()): number {
  const d = jakartaDay(now).getUTCDay();
  return d === 0 ? 7 : d;
}

/** ISO week key like "2026-W43" for the Jakarta day of `date`. */
export function isoWeekKey(date = new Date()): string {
  const d = jakartaDay(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Key of the week before `weekKey`'s week (for ▲▼ trend comparisons). */
export function previousWeekKey(date = new Date()): string {
  return isoWeekKey(new Date(date.getTime() - 7 * DAY_MS));
}

export const WEEKDAY_LABEL: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "23 Oktober 2026" for a UTC-midnight date-only value. */
export function formatLongDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Monday–Sunday (Jakarta calendar) of the ISO week containing `date`, plus its number. */
export function isoWeekInfo(date = new Date()): { week: number; year: number; start: Date; end: Date; label: string } {
  const day = jakartaDay(date);
  const dow = day.getUTCDay() || 7;
  const start = new Date(day.getTime() - (dow - 1) * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const [y, w] = isoWeekKey(date).split("-W");
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const label = sameMonth
    ? `${start.getUTCDate()}–${formatLongDate(end)}`
    : sameYear
      ? `${start.getUTCDate()} ${MONTHS_LONG[start.getUTCMonth()]} – ${formatLongDate(end)}`
      : `${formatLongDate(start)} – ${formatLongDate(end)}`;
  return { week: Number(w), year: Number(y), start, end, label };
}
