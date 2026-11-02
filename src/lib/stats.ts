/**
 * Per-habit statistics (spec 5.5).
 *
 * What counts as a "completion":
 * - Yes/No habits: a day entered as done ('y'). Auto-ticks are not counted.
 * - Measurable habits: history totals sum the entered values; "completions"
 *   (total + weekday dot grid) count days with an entered value > 0.
 */
import {
  addMonths,
  addYears,
  monthKey,
  nextPeriodStart,
  startOfPeriod,
  weekdayOf,
  type Period,
} from './dates';
import { computeScores, currentScore, scoreOn, type ScorePoint } from './score';
import { computeTimeline, type DayInfo, type Timeline } from './status';
import { computeStreaks, type StreakSummary } from './streaks';
import type { DateStr, EntryMap, EntryValue, Habit, Weekday } from './types';

/** How much a single entered value contributes to history totals. */
export function entryAmount(habit: Habit, value: EntryValue | undefined): number {
  if (habit.type === 'boolean') return value === 'y' ? 1 : 0;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Whether an entered value counts as one "completion" for totals and the weekday grid. */
export function isCompletion(habit: Habit, value: EntryValue | undefined): boolean {
  return habit.type === 'boolean' ? value === 'y' : typeof value === 'number' && value > 0;
}

export interface Overview {
  score: number; // 0–1
  scoreMonthAgo: number;
  scoreYearAgo: number;
  /** Change in percentage points ×0.01 (e.g. 0.12 = +12 points). */
  monthChange: number;
  yearChange: number;
  /** Number of completion days. */
  totalCompletions: number;
  /** Sum of entered values (measurable habits); equals totalCompletions for Yes/No. */
  totalValue: number;
}

export function computeOverview(habit: Habit, timeline: Timeline, scores: ScorePoint[]): Overview {
  const score = currentScore(scores);
  const scoreMonthAgo = scoreOn(scores, addMonths(timeline.today, -1));
  const scoreYearAgo = scoreOn(scores, addYears(timeline.today, -1));
  let totalCompletions = 0;
  let totalValue = 0;
  for (const d of timeline.days) {
    if (isCompletion(habit, d.value)) totalCompletions++;
    totalValue += entryAmount(habit, d.value);
  }
  return {
    score,
    scoreMonthAgo,
    scoreYearAgo,
    monthChange: score - scoreMonthAgo,
    yearChange: score - scoreYearAgo,
    totalCompletions,
    totalValue,
  };
}

export interface PeriodTotal {
  /** First day of the period. */
  start: DateStr;
  total: number;
}

/**
 * Totals per week / month / quarter / year, from the period containing the first day
 * of the timeline up to the period containing today. Empty periods are included (0).
 */
export function historyTotals(
  habit: Habit,
  timeline: Timeline,
  period: Period,
  weekStart: Weekday = 1,
): PeriodTotal[] {
  if (timeline.days.length === 0) return [];
  const totals = new Map<DateStr, number>();
  for (const d of timeline.days) {
    const amount = entryAmount(habit, d.value);
    if (amount === 0) continue;
    const key = startOfPeriod(d.date, period, weekStart);
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  const out: PeriodTotal[] = [];
  const last = startOfPeriod(timeline.today, period, weekStart);
  for (let p = startOfPeriod(timeline.firstDate, period, weekStart); p <= last;) {
    out.push({ start: p, total: totals.get(p) ?? 0 });
    p = nextPeriodStart(p, period);
  }
  return out;
}

export interface WeekdayMonthRow {
  /** `YYYY-MM` */
  month: string;
  /** Completions per weekday, indexed 0 = Sunday … 6 = Saturday. */
  counts: [number, number, number, number, number, number, number];
}

/** Completions per weekday for each month (ascending, every month in range included). */
export function weekdayFrequency(habit: Habit, timeline: Timeline): WeekdayMonthRow[] {
  if (timeline.days.length === 0) return [];
  const rows = new Map<string, WeekdayMonthRow>();
  for (
    let p = startOfPeriod(timeline.firstDate, 'month');
    p <= timeline.today;
    p = addMonths(p, 1)
  ) {
    rows.set(monthKey(p), { month: monthKey(p), counts: [0, 0, 0, 0, 0, 0, 0] });
  }
  for (const d of timeline.days) {
    if (!isCompletion(habit, d.value)) continue;
    const row = rows.get(monthKey(d.date));
    if (row) row.counts[weekdayOf(d.date)]++;
  }
  return [...rows.values()];
}

/** Per-day status for the calendar heatmap, keyed by date. */
export function calendarData(timeline: Timeline): Map<DateStr, DayInfo> {
  return new Map(timeline.days.map((d) => [d.date, d]));
}

/** Everything the UI typically needs for one habit, computed in one pass. */
export interface HabitAnalysis {
  timeline: Timeline;
  scores: ScorePoint[];
  score: number;
  streaks: StreakSummary;
}

export function analyzeHabit(habit: Habit, entries: EntryMap, today: DateStr): HabitAnalysis {
  const timeline = computeTimeline(habit, entries, today);
  const scores = computeScores(timeline, habit.frequency);
  return { timeline, scores, score: currentScore(scores), streaks: computeStreaks(timeline) };
}
