/**
 * Day-by-day status for a habit (spec 5.1 and 5.3).
 *
 * Every frequency becomes "X times in N days" and is checked over a rolling window
 * `[d − N + 1, d]`. The result is a `Timeline`: one `DayInfo` per day from the first
 * relevant day up to today. Score, streaks and stats are all derived from it.
 */
import { addDays, diffDays, fromDayNum, minDate, toDayNum } from './dates';
import { toWindow } from './frequency';
import type { DateStr, DayStatus, EntryMap, EntryValue, Habit } from './types';

export interface DayInfo {
  date: DateStr;
  status: DayStatus;
  /** Raw entered value, if any. */
  value: EntryValue | undefined;
  /**
   * Input to the strength score for this day:
   * 1 (or a fraction for numeric at-least habits) / 0, or `null` meaning
   * "leave the score unchanged" (skipped, before startDate, or today not yet entered).
   */
  v: number | null;
  /**
   * True only for *today* when nothing is entered yet and the target isn't met by
   * other days in the window. Status is still `missed`, but the day isn't over, so
   * it doesn't lower the score or break the current streak.
   */
  pending: boolean;
}

export interface Timeline {
  /** First day covered: the earlier of `startDate` and the earliest entry. */
  firstDate: DateStr;
  startDate: DateStr;
  today: DateStr;
  /** Ascending, from `firstDate` to `today` inclusive. Empty if the habit starts in the future. */
  days: DayInfo[];
}

type Normalised = { kind: 'yes' } | { kind: 'no' } | { kind: 'skip' } | { kind: 'num'; n: number };

function normalise(habit: Habit, value: EntryValue | undefined): Normalised | undefined {
  if (value === undefined) return undefined;
  if (value === 's') return { kind: 'skip' };
  if (habit.type === 'numeric') {
    return typeof value === 'number' && Number.isFinite(value)
      ? { kind: 'num', n: value }
      : undefined;
  }
  if (value === 'y') return { kind: 'yes' };
  if (value === 'n') return { kind: 'no' };
  return undefined;
}

export function computeTimeline(habit: Habit, entries: EntryMap, today: DateStr): Timeline {
  const startDate = habit.startDate;
  let firstDate = startDate;
  for (const date of Object.keys(entries)) {
    if (date <= today && normalise(habit, entries[date]) !== undefined) {
      firstDate = minDate(firstDate, date);
    }
  }
  if (firstDate > today) return { firstDate, startDate, today, days: [] };

  const { times, days: windowDays } = toWindow(habit.frequency);
  const length = diffDays(today, firstDate) + 1;
  const firstNum = toDayNum(firstDate);
  const startIdx = diffDays(startDate, firstDate);

  // Per-day normalised entries + prefix sums so each window lookup is O(1).
  const norm: (Normalised | undefined)[] = new Array(length);
  const prefix = new Float64Array(length + 1);
  for (let i = 0; i < length; i++) {
    const n = normalise(habit, entries[fromDayNum(firstNum + i)]);
    norm[i] = n;
    const add =
      habit.type === 'boolean' ? (n?.kind === 'yes' ? 1 : 0) : n?.kind === 'num' ? n.n : 0;
    prefix[i + 1] = prefix[i]! + add;
  }
  const windowSum = (i: number) => prefix[i + 1]! - prefix[Math.max(0, i - windowDays + 1)]!;

  const target = habit.target ?? 0;
  const targetType = habit.targetType ?? 'atLeast';

  const out: DayInfo[] = new Array(length);
  for (let i = 0; i < length; i++) {
    const date = fromDayNum(firstNum + i);
    const n = norm[i];
    const value = n === undefined ? undefined : entries[date];
    const beforeStart = i < startIdx;
    const isToday = i === length - 1;

    let status: DayStatus;
    let v: number | null;
    let pending = false;

    if (beforeStart && n === undefined) {
      status = 'unknown';
      v = null;
    } else if (n?.kind === 'skip') {
      status = 'skipped';
      v = null;
    } else if (habit.type === 'boolean') {
      if (n?.kind === 'yes') {
        status = 'done';
        v = 1;
      } else if (n === undefined && windowSum(i) >= times) {
        status = 'autoDone';
        v = 1;
      } else {
        status = 'missed';
        v = 0;
      }
    } else {
      const sum = windowSum(i);
      const own = n?.kind === 'num' ? n.n : undefined;
      if (targetType === 'atMost') {
        const met = sum <= target;
        status = met ? (own !== undefined ? 'done' : 'autoDone') : 'missed';
        v = met ? 1 : 0;
      } else {
        const met = sum >= target;
        status = met ? (own !== undefined && own > 0 ? 'done' : 'autoDone') : 'missed';
        v = target > 0 ? Math.min(1, Math.max(0, sum / target)) : 1;
      }
    }

    if (isToday && n === undefined && status === 'missed') {
      pending = true;
      v = null;
    }
    if (beforeStart) v = null;

    out[i] = { date, status, value, v, pending };
  }

  return { firstDate, startDate, today, days: out };
}

/** Looks up a day in a timeline; days outside it (future, or before any data) are `unknown`. */
export function dayInfo(timeline: Timeline, date: DateStr): DayInfo {
  const i = diffDays(date, timeline.firstDate);
  const d = i >= 0 ? timeline.days[i] : undefined;
  return d ?? { date, status: 'unknown', value: undefined, v: null, pending: false };
}

/** Statuses for the `count` days ending at `timeline.today`, oldest first. */
export function recentDays(timeline: Timeline, count: number): DayInfo[] {
  const out: DayInfo[] = [];
  for (let k = count - 1; k >= 0; k--) out.push(dayInfo(timeline, addDays(timeline.today, -k)));
  return out;
}
