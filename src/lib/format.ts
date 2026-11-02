import { weekdayOf } from './dates';
import type { DateStr } from './types';

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function weekdayShort(date: DateStr): string {
  return WEEKDAYS_SHORT[weekdayOf(date)];
}

export function dayOfMonth(date: DateStr): number {
  return Number(date.slice(8, 10));
}

export function monthShort(date: DateStr): string {
  return MONTHS_SHORT[Number(date.slice(5, 7)) - 1] ?? '';
}

/** "Monday 2 Nov" — used in labels and the number sheet title. */
export function longDate(date: DateStr): string {
  return `${WEEKDAYS_LONG[weekdayOf(date)]} ${dayOfMonth(date)} ${monthShort(date)}`;
}

/** "2 Nov 2026" */
export function shortDateWithYear(date: DateStr): string {
  return `${dayOfMonth(date)} ${monthShort(date)} ${date.slice(0, 4)}`;
}

/** Compact number for a small box: 3, 2.5, 12.3, 1.2k, 15k. */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000, abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1000) return `${trim(n / 1000, abs >= 10_000 ? 0 : 1)}k`;
  if (abs >= 100) return trim(n, 0);
  if (abs >= 10) return trim(n, 1);
  return trim(n, 2);
}

/** Full number with up to 2 decimals: 1234.5 → "1,234.5". */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function trim(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

/** Parses user input like "2.5", "2,5" or " 10 " into a non-negative number, or null. */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
