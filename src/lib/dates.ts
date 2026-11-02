/**
 * Date helpers that work purely on `YYYY-MM-DD` strings.
 *
 * Internally a day is converted to a "day number" (days since 1970-01-01, UTC), so
 * arithmetic never touches the device's local time zone or daylight-saving rules.
 * The only place a real time zone matters is working out what "today" is.
 */
import { formatInTimeZone } from 'date-fns-tz';
import type { DateStr, Weekday } from './types';

export const DEFAULT_TIMEZONE = 'Asia/Singapore';
const MS_PER_DAY = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(date: DateStr): [number, number, number] {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date string: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function isValidDateStr(date: string): boolean {
  const m = DATE_RE.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function toDayNum(date: DateStr): number {
  const [y, m, d] = parts(date);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNum(n: number): DateStr {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(date: DateStr, days: number): DateStr {
  return fromDayNum(toDayNum(date) + days);
}

/** Whole days from `b` to `a` (positive when `a` is later). */
export function diffDays(a: DateStr, b: DateStr): number {
  return toDayNum(a) - toDayNum(b);
}

/** Inclusive list of dates from `from` to `to`. Empty if `from > to`. */
export function dateRange(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let n = toDayNum(from), end = toDayNum(to); n <= end; n++) out.push(fromDayNum(n));
  return out;
}

export function minDate(a: DateStr, b: DateStr): DateStr {
  return a <= b ? a : b;
}

export function maxDate(a: DateStr, b: DateStr): DateStr {
  return a >= b ? a : b;
}

/** Today's date in the given IANA time zone (falls back to Singapore if the zone is invalid). */
export function todayIn(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): DateStr {
  try {
    return formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  } catch {
    return formatInTimeZone(now, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Past days and today can be edited; future days cannot. */
export function isEditable(date: DateStr, today: DateStr): boolean {
  return date <= today;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: DateStr): Weekday {
  // 1970-01-01 was a Thursday (4).
  return ((((toDayNum(date) + 4) % 7) + 7) % 7) as Weekday;
}

export function startOfWeek(date: DateStr, weekStart: Weekday = 1): DateStr {
  const offset = (weekdayOf(date) - weekStart + 7) % 7;
  return addDays(date, -offset);
}

export function startOfMonth(date: DateStr): DateStr {
  return `${date.slice(0, 7)}-01`;
}

export function startOfQuarter(date: DateStr): DateStr {
  const [y, m] = parts(date);
  const qm = Math.floor((m - 1) / 3) * 3 + 1;
  return `${y}-${String(qm).padStart(2, '0')}-01`;
}

export function startOfYear(date: DateStr): DateStr {
  return `${date.slice(0, 4)}-01-01`;
}

export function yearOf(date: DateStr): number {
  return parts(date)[0];
}

/** `YYYY-MM` */
export function monthKey(date: DateStr): string {
  return date.slice(0, 7);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Adds calendar months, clamping the day (e.g. Mar 31 − 1 month → Feb 28/29). */
export function addMonths(date: DateStr, months: number): DateStr {
  const [y, m, d] = parts(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

export function addYears(date: DateStr, years: number): DateStr {
  return addMonths(date, years * 12);
}

export type Period = 'week' | 'month' | 'quarter' | 'year';

/** First day of the period containing `date`. */
export function startOfPeriod(date: DateStr, period: Period, weekStart: Weekday = 1): DateStr {
  switch (period) {
    case 'week':
      return startOfWeek(date, weekStart);
    case 'month':
      return startOfMonth(date);
    case 'quarter':
      return startOfQuarter(date);
    case 'year':
      return startOfYear(date);
  }
}

/** First day of the period after the one starting at `periodStart`. */
export function nextPeriodStart(periodStart: DateStr, period: Period): DateStr {
  switch (period) {
    case 'week':
      return addDays(periodStart, 7);
    case 'month':
      return addMonths(periodStart, 1);
    case 'quarter':
      return addMonths(periodStart, 3);
    case 'year':
      return addYears(periodStart, 1);
  }
}
