/** Pure data shaping for the detail-screen charts (no React). */
import {
  addDays,
  monthKey,
  nextPeriodStart,
  startOfPeriod,
  startOfWeek,
  type Period,
} from './dates';
import { dayOfMonth, monthShort } from './format';
import type { ScorePoint } from './score';
import type { DateStr, Weekday } from './types';

export type ScoreZoom = 'day' | Period;

export interface SeriesPoint {
  /** First day of the bucket (the day itself for 'day'). */
  start: DateStr;
  value: number;
}

/** Score per bucket: the score on the last day of each day/week/month/quarter/year. */
export function scoreSeries(
  scores: ScorePoint[],
  zoom: ScoreZoom,
  weekStart: Weekday = 1,
): SeriesPoint[] {
  if (zoom === 'day') return scores.map((p) => ({ start: p.date, value: p.score }));
  const out: SeriesPoint[] = [];
  for (const p of scores) {
    const start = startOfPeriod(p.date, zoom, weekStart);
    const last = out[out.length - 1];
    if (last && last.start === start) last.value = p.score;
    else out.push({ start, value: p.score });
  }
  return out;
}

/** Short x-axis label for a bucket, or null when this bucket shouldn't be labelled. */
export function axisLabel(
  start: DateStr,
  zoom: ScoreZoom,
  index: number,
  weekStart: Weekday = 1,
): string | null {
  const yy = `’${start.slice(2, 4)}`;
  switch (zoom) {
    case 'day':
      // Label the first day of each week.
      return startOfWeek(start, weekStart) === start
        ? `${dayOfMonth(start)} ${monthShort(start)}`
        : null;
    case 'week':
      return index % 4 === 0 ? `${dayOfMonth(start)} ${monthShort(start)}` : null;
    case 'month':
      return start.slice(5, 7) === '01' ? `${monthShort(start)} ${yy}` : monthShort(start);
    case 'quarter':
      return `Q${Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1} ${yy}`;
    case 'year':
      return start.slice(0, 4);
  }
}

/** Horizontal spacing (px) between buckets for each zoom level. */
export const PITCH: Record<ScoreZoom, number> = {
  day: 12,
  week: 28,
  month: 36,
  quarter: 52,
  year: 56,
};

/**
 * Week columns for the calendar heatmap: from the week containing `firstDate`
 * (or at least `minWeeks` back) up to the week containing `today`.
 */
export function calendarWeeks(
  firstDate: DateStr,
  today: DateStr,
  weekStart: Weekday = 1,
  minWeeks = 8,
): DateStr[] {
  const last = startOfWeek(today, weekStart);
  let first = startOfWeek(firstDate < today ? firstDate : today, weekStart);
  const minFirst = addDays(last, -7 * (minWeeks - 1));
  if (first > minFirst) first = minFirst;
  const weeks: DateStr[] = [];
  for (let w = first; w <= last; w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

/** Month label for each calendar column: shown on the column containing the 1st, and on the first column. */
export function weekMonthLabels(weeks: DateStr[]): (string | null)[] {
  return weeks.map((w, i) => {
    const end = addDays(w, 6);
    if (i === 0) return monthShort(end);
    if (monthKey(end) !== monthKey(w) || dayOfMonth(w) === 1) {
      const firstOfMonth = monthKey(end) !== monthKey(w) ? end : w;
      return firstOfMonth.slice(5, 7) === '01'
        ? `${monthShort(firstOfMonth)} ${firstOfMonth.slice(0, 4)}`
        : monthShort(firstOfMonth);
    }
    return null;
  });
}

/** Weekdays in display order, starting at `weekStart`. */
export function orderedWeekdays(weekStart: Weekday): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => ((weekStart + i) % 7) as Weekday);
}

/** Months (`YYYY-MM-01`) from the month containing `from` to the month containing `to`. */
export function monthsBetween(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let m = startOfPeriod(from, 'month'); m <= to; m = nextPeriodStart(m, 'month')) out.push(m);
  return out;
}

/** "+12%", "−3%", "0%" for a change in score (0–1 scale). */
export function formatChange(delta: number): string {
  const pts = Math.round(delta * 100);
  if (pts === 0) return '0%';
  return `${pts > 0 ? '+' : '−'}${Math.abs(pts)}%`;
}
