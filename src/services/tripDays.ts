import type { DaySchedule } from '../types/travel';
import type { Lang } from '../utils/i18n';

/**
 * Days and dates, kept in step.
 *
 * Days used to be generated once when a trip was created and never touched
 * again, so editing the trip's dates in settings left the itinerary at the old
 * length — and left each day's own `dateString` disagreeing with the offset the
 * itinerary uses to find "today".
 */

/**
 * Parse YYYY-MM-DD in local time. `new Date('2026-09-01')` is parsed as UTC
 * midnight, which lands on the previous day for anyone west of Greenwich.
 */
export function parseLocalDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "Monday (Sep 1)" — the label the itinerary and print view both read. */
export function dayLabel(d: Date): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const short = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday} (${short})`;
}

/**
 * The trip's dates as one line -- "Nov 14 - Nov 19" -- in the reader's
 * language. Shared by the trip banner and the trip switcher, because one
 * trip printing its dates two ways in two places is how they drift.
 *
 * Through parseLocalDate, not `new Date(iso)`: the plain constructor reads
 * a bare date as UTC midnight, which prints the day before for any reader
 * west of Greenwich.
 *
 * The year appears only when the trip is not in the current one, and then on
 * the end the language puts it: Chinese states a year before the date it
 * belongs to, English after. A list of finished trips without it reads
 * "5月21日" against "8月14日" with no way to tell which year is which,
 * and printing the year on both ends of every range is four wasted words on
 * the trip somebody is actually on.
 */
export function formatDateRange(startDate: string, endDate: string, lang: Lang): string {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end) return `${startDate} - ${endDate}`;

  const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
  const dayOnly: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const withYear: Intl.DateTimeFormatOptions = { ...dayOnly, year: 'numeric' };

  const thisYear = new Date().getFullYear();
  const spansAnotherYear =
    start.getFullYear() !== thisYear || end.getFullYear() !== thisYear;

  const at = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString(locale, opts);
  if (!spansAnotherYear) return `${at(start, dayOnly)} – ${at(end, dayOnly)}`;

  return lang === 'zh'
    ? `${at(start, withYear)} – ${at(end, dayOnly)}`
    : `${at(start, dayOnly)} – ${at(end, withYear)}`;
}

/** A trip longer than this is almost certainly a mistyped year. */
export const MAX_DAYS = 30;

export function countDays(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end) return 3;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (diff < 1) return 1;
  return Math.min(diff, MAX_DAYS);
}

export function buildDay(start: Date, index: number): DaySchedule {
  const current = new Date(start);
  current.setDate(start.getDate() + index);
  return {
    id: `day-${index + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dayNumber: index + 1,
    dateString: toISODate(current),
    dayOfWeek: dayLabel(current),
    title: '',
    activities: []
  };
}

export function buildDays(startDate: string, endDate: string): DaySchedule[] {
  const start = parseLocalDate(startDate) ?? new Date();
  return Array.from({ length: countDays(startDate, endDate) }, (_, i) => buildDay(start, i));
}

export interface DayReconciliation {
  days: DaySchedule[];
  /**
   * Days that fell outside the shortened range but still held activities, so
   * they were kept rather than deleted. Non-zero means the user should be told.
   */
  keptWithActivities: number;
}

/**
 * Bring `days` in line with a new date range.
 *
 * Growing appends blank days. Shrinking drops trailing days **only when they
 * are empty** — a day someone has already planned is never silently deleted,
 * because losing an afternoon of research to a mistyped date is far worse than
 * carrying one extra day until it is removed on purpose.
 */
export function reconcileDays(
  existing: DaySchedule[],
  startDate: string,
  endDate: string
): DayReconciliation {
  const start = parseLocalDate(startDate);
  if (!start) return { days: existing, keptWithActivities: 0 };

  const target = countDays(startDate, endDate);
  const kept = [...existing];

  // Trim from the end, stopping at the first day that has anything in it.
  let keptWithActivities = 0;
  while (kept.length > target) {
    const last = kept[kept.length - 1];
    if (last.activities && last.activities.length > 0) {
      keptWithActivities = kept.length - target;
      break;
    }
    kept.pop();
  }

  while (kept.length < target) {
    kept.push(buildDay(start, kept.length));
  }

  // Re-date and renumber everything, so a moved start date carries the whole
  // itinerary with it instead of leaving each day's own date behind.
  const days = kept.map((day, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return {
      ...day,
      dayNumber: index + 1,
      dateString: toISODate(current),
      dayOfWeek: dayLabel(current)
    };
  });

  return { days, keptWithActivities };
}
