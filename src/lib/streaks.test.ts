import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeTimeline } from './status';
import { computeStreaks } from './streaks';
import { TODAY, makeHabit, run } from './test-helpers';
import type { EntryMap, Habit } from './types';

const streaksFor = (habit: Habit, entries: EntryMap, today = TODAY) =>
  computeStreaks(computeTimeline(habit, entries, today));

describe('computeStreaks', () => {
  const habit = makeHabit({ startDate: '2026-10-01' });

  it('counts consecutive done days and is broken by a miss', () => {
    const entries = { ...run('2026-10-01', 4), ...run('2026-10-06', 2) }; // 5 Oct missed
    const s = streaksFor(habit, entries, '2026-10-07');
    expect(s.best).toEqual([
      { start: '2026-10-01', end: '2026-10-04', length: 4 },
      { start: '2026-10-06', end: '2026-10-07', length: 2 },
    ]);
    expect(s.current).toBe(2);
  });

  it('skipped days neither break a streak nor add to its length', () => {
    const entries: EntryMap = { ...run('2026-10-01', 3), ...run('2026-10-04', 2, 's') };
    Object.assign(entries, run('2026-10-06', 3));
    const s = streaksFor(habit, entries, '2026-10-08');
    expect(s.best[0]).toEqual({ start: '2026-10-01', end: '2026-10-08', length: 6 });
    expect(s.current).toBe(6);
  });

  it('an un-entered today does not break the current streak', () => {
    const s = streaksFor(habit, run('2026-10-25', 8)); // through 1 Nov, today (2 Nov) empty
    expect(s.current).toBe(8);
    expect(s.currentStreak).toEqual({ start: '2026-10-25', end: '2026-11-01', length: 8 });
  });

  it('current streak is 0 when yesterday was missed', () => {
    const s = streaksFor(habit, run('2026-10-20', 5)); // ends 24 Oct
    expect(s.current).toBe(0);
    expect(s.currentStreak).toBeNull();
    expect(s.best[0]!.length).toBe(5);
  });

  it('includes auto-ticked days for X per week habits', () => {
    const weekly = makeHabit({
      startDate: '2026-10-19',
      frequency: { kind: 'timesPerWeek', times: 3 },
    });
    // Mon–Wed done → Thu–Sun auto → Mon 26 missed (today = Tue 27)
    const s = streaksFor(weekly, run('2026-10-19', 3), '2026-10-27');
    expect(s.best[0]).toEqual({ start: '2026-10-19', end: '2026-10-25', length: 7 });
    expect(s.current).toBe(0);
  });

  it('returns the top 5, longest first, ties broken by most recent', () => {
    const entries: EntryMap = {};
    const lengths = [2, 5, 3, 5, 1, 4, 2];
    let d = '2026-09-01';
    for (const len of lengths) {
      Object.assign(entries, run(d, len));
      d = addDays(d, len + 1); // one missed day between streaks
    }
    const s = streaksFor(habit, entries, d);
    const lens = s.best.map((x) => x.length);
    expect(lens).toEqual([5, 5, 4, 3, 2]);
    expect(s.best[0]!.start > s.best[1]!.start).toBe(true); // more recent 5 first
    expect(computeStreaks(computeTimeline(habit, entries, d), 2).best).toHaveLength(2);
  });

  it('handles no data', () => {
    expect(streaksFor(habit, {})).toEqual({ current: 0, currentStreak: null, best: [] });
  });
});
