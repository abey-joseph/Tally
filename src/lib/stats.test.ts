import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeScores } from './score';
import {
  analyzeHabit,
  calendarData,
  computeOverview,
  historyTotals,
  weekdayFrequency,
} from './stats';
import { computeTimeline } from './status';
import { TODAY, makeHabit, run } from './test-helpers';
import type { EntryMap, Habit } from './types';

const timelineOf = (habit: Habit, entries: EntryMap, today = TODAY) =>
  computeTimeline(habit, entries, today);

describe('computeOverview', () => {
  it('reports the score and its change vs 1 month and 1 year ago', () => {
    const habit = makeHabit({ startDate: '2025-06-01' });
    const entries = run('2026-09-01', 63); // 1 Sep – 2 Nov
    const t = timelineOf(habit, entries);
    const o = computeOverview(habit, t, computeScores(t, habit.frequency));
    expect(o.scoreYearAgo).toBe(0);
    expect(o.scoreMonthAgo).toBeGreaterThan(0.8);
    expect(o.score).toBeGreaterThan(o.scoreMonthAgo);
    expect(o.monthChange).toBeCloseTo(o.score - o.scoreMonthAgo, 12);
    expect(o.yearChange).toBeCloseTo(o.score, 12);
    expect(o.totalCompletions).toBe(63);
    expect(o.totalValue).toBe(63);
  });

  it('a habit younger than a month compares against 0', () => {
    const habit = makeHabit({ startDate: '2026-10-25' });
    const t = timelineOf(habit, run('2026-10-25', 9));
    const o = computeOverview(habit, t, computeScores(t, habit.frequency));
    expect(o.scoreMonthAgo).toBe(0);
    expect(o.monthChange).toBe(o.score);
  });

  it('numeric totals: completions = days > 0, value = sum', () => {
    const habit = makeHabit({ type: 'numeric', startDate: '2026-10-01', target: 5 });
    const entries: EntryMap = {
      '2026-10-01': 2.5,
      '2026-10-02': 0,
      '2026-10-03': 4,
      '2026-10-04': 's',
    };
    const t = timelineOf(habit, entries);
    const o = computeOverview(habit, t, computeScores(t, habit.frequency));
    expect(o.totalCompletions).toBe(2);
    expect(o.totalValue).toBe(6.5);
  });

  it('auto-ticks are not counted as completions', () => {
    const habit = makeHabit({
      startDate: '2026-10-19',
      frequency: { kind: 'timesPerWeek', times: 3 },
    });
    const t = timelineOf(habit, run('2026-10-19', 3));
    expect(computeOverview(habit, t, computeScores(t, habit.frequency)).totalCompletions).toBe(3);
  });
});

describe('historyTotals', () => {
  const habit = makeHabit({ startDate: '2026-10-01' });
  const entries: EntryMap = {
    '2026-10-01': 'y', // Thu
    '2026-10-04': 'y', // Sun
    '2026-10-05': 'y', // Mon
    '2026-10-20': 'n',
    '2026-10-21': 's',
    '2026-11-01': 'y', // Sun
    '2026-11-02': 'y', // Mon (today)
  };
  const t = timelineOf(habit, entries);

  it('groups by Monday-start weeks and includes empty weeks', () => {
    const weeks = historyTotals(habit, t, 'week', 1);
    expect(weeks[0]).toEqual({ start: '2026-09-28', total: 2 });
    expect(weeks[1]).toEqual({ start: '2026-10-05', total: 1 });
    expect(weeks.find((w) => w.start === '2026-10-19')).toEqual({ start: '2026-10-19', total: 0 });
    expect(weeks.at(-2)).toEqual({ start: '2026-10-26', total: 1 });
    expect(weeks.at(-1)).toEqual({ start: '2026-11-02', total: 1 });
    expect(weeks).toHaveLength(6);
  });

  it('respects a Sunday week start', () => {
    const weeks = historyTotals(habit, t, 'week', 0);
    expect(weeks[0]).toEqual({ start: '2026-09-27', total: 1 });
    expect(weeks[1]).toEqual({ start: '2026-10-04', total: 2 });
    expect(weeks.at(-1)).toEqual({ start: '2026-11-01', total: 2 });
  });

  it('groups by month, quarter and year', () => {
    expect(historyTotals(habit, t, 'month')).toEqual([
      { start: '2026-10-01', total: 3 },
      { start: '2026-11-01', total: 2 },
    ]);
    expect(historyTotals(habit, t, 'quarter')).toEqual([{ start: '2026-10-01', total: 5 }]);
    expect(historyTotals(habit, t, 'year')).toEqual([{ start: '2026-01-01', total: 5 }]);
  });

  it('spans year boundaries without gaps', () => {
    const h = makeHabit({ startDate: '2024-11-15' });
    const months = historyTotals(h, timelineOf(h, { '2024-11-20': 'y' }), 'month');
    expect(months).toHaveLength(25); // Nov 2024 … Nov 2026
    expect(months[0]).toEqual({ start: '2024-11-01', total: 1 });
    expect(months[2]!.start).toBe('2025-01-01');
    expect(historyTotals(h, timelineOf(h, {}), 'year').map((y) => y.start)).toEqual([
      '2024-01-01',
      '2025-01-01',
      '2026-01-01',
    ]);
  });

  it('sums values for numeric habits', () => {
    const h = makeHabit({ type: 'numeric', startDate: '2026-10-01', target: 5 });
    const e: EntryMap = { '2026-10-01': 2.5, '2026-10-15': 4, '2026-11-02': 1.25 };
    expect(historyTotals(h, timelineOf(h, e), 'month')).toEqual([
      { start: '2026-10-01', total: 6.5 },
      { start: '2026-11-01', total: 1.25 },
    ]);
  });

  it('is empty for a habit that has not started', () => {
    const h = makeHabit({ startDate: '2027-01-01' });
    expect(historyTotals(h, timelineOf(h, {}), 'week')).toEqual([]);
  });
});

describe('weekdayFrequency', () => {
  it('counts completions per weekday per month, including empty months', () => {
    const habit = makeHabit({ startDate: '2026-09-01' });
    const entries: EntryMap = {
      '2026-09-07': 'y', // Mon
      '2026-09-14': 'y', // Mon
      '2026-09-16': 'y', // Wed
      '2026-09-17': 'n', // Thu — not a completion
      '2026-11-01': 'y', // Sun
    };
    const rows = weekdayFrequency(habit, timelineOf(habit, entries));
    expect(rows.map((r) => r.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(rows[0]!.counts).toEqual([0, 2, 0, 1, 0, 0, 0]);
    expect(rows[1]!.counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(rows[2]!.counts).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it('numeric: counts days with a value above 0', () => {
    const habit = makeHabit({ type: 'numeric', startDate: '2026-11-01', target: 1 });
    const rows = weekdayFrequency(habit, timelineOf(habit, { '2026-11-01': 0, '2026-11-02': 3 }));
    expect(rows[0]!.counts).toEqual([0, 1, 0, 0, 0, 0, 0]);
  });
});

describe('calendarData', () => {
  it('maps every day in the timeline to its status', () => {
    const habit = makeHabit({ startDate: '2026-10-30' });
    const cal = calendarData(timelineOf(habit, { '2026-10-30': 'y', '2026-10-31': 's' }));
    expect(cal.size).toBe(4);
    expect(cal.get('2026-10-30')!.status).toBe('done');
    expect(cal.get('2026-10-31')!.status).toBe('skipped');
    expect(cal.get('2026-11-01')!.status).toBe('missed');
    expect(cal.get(TODAY)!.pending).toBe(true);
  });
});

describe('analyzeHabit', () => {
  it('bundles timeline, scores, current score and streaks', () => {
    const habit = makeHabit({ startDate: '2026-08-01' });
    const a = analyzeHabit(habit, run('2026-08-01', 93), TODAY); // through 1 Nov
    expect(a.timeline.days).toHaveLength(94);
    expect(a.scores).toHaveLength(94);
    expect(a.score).toBeGreaterThan(0.95);
    expect(a.streaks.current).toBe(93);
  });

  it('stays fast for many years of daily data', () => {
    const habit = makeHabit({ startDate: '2016-11-02' });
    const entries = run('2016-11-02', 3650);
    const t0 = performance.now();
    const a = analyzeHabit(habit, entries, addDays('2016-11-02', 3652));
    expect(a.timeline.days.length).toBe(3653);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
