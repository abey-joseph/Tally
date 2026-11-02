import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeTimeline, dayInfo, recentDays } from './status';
import { TODAY, makeHabit, run } from './test-helpers';
import type { DayStatus, EntryMap, Habit } from './types';

const statusOf = (habit: Habit, entries: EntryMap, date: string, today = TODAY): DayStatus =>
  dayInfo(computeTimeline(habit, entries, today), date).status;

describe('daily Yes/No habit', () => {
  const habit = makeHabit({ startDate: '2026-10-26' }); // Monday a week before TODAY

  it('maps entries to done / skipped / missed', () => {
    const entries: EntryMap = { '2026-10-26': 'y', '2026-10-27': 's', '2026-10-28': 'n' };
    expect(statusOf(habit, entries, '2026-10-26')).toBe('done');
    expect(statusOf(habit, entries, '2026-10-27')).toBe('skipped');
    expect(statusOf(habit, entries, '2026-10-28')).toBe('missed'); // explicit no
    expect(statusOf(habit, entries, '2026-10-29')).toBe('missed'); // not entered
  });

  it('is unknown before startDate and in the future', () => {
    expect(statusOf(habit, {}, '2026-10-25')).toBe('unknown');
    expect(statusOf(habit, {}, '2026-11-03')).toBe('unknown');
  });

  it('covers every day from startDate to today, in order', () => {
    const t = computeTimeline(habit, {}, TODAY);
    expect(t.days).toHaveLength(8);
    expect(t.days[0]!.date).toBe('2026-10-26');
    expect(t.days.at(-1)!.date).toBe(TODAY);
  });

  it('marks today as pending (not scored) when nothing is entered yet', () => {
    const t = computeTimeline(habit, {}, TODAY);
    const today = dayInfo(t, TODAY);
    expect(today).toMatchObject({ status: 'missed', pending: true, v: null });
    const yesterday = dayInfo(t, addDays(TODAY, -1));
    expect(yesterday).toMatchObject({ status: 'missed', pending: false, v: 0 });
  });

  it('an explicit "no" today is a real miss, not pending', () => {
    const t = computeTimeline(habit, { [TODAY]: 'n' }, TODAY);
    expect(dayInfo(t, TODAY)).toMatchObject({ status: 'missed', pending: false, v: 0 });
  });

  it('score inputs: done = 1, missed = 0, skipped = null', () => {
    const t = computeTimeline(habit, { '2026-10-26': 'y', '2026-10-27': 's' }, TODAY);
    expect(dayInfo(t, '2026-10-26').v).toBe(1);
    expect(dayInfo(t, '2026-10-27').v).toBeNull();
    expect(dayInfo(t, '2026-10-28').v).toBe(0);
  });

  it('ignores future entries and garbage values', () => {
    const entries = { '2026-11-05': 'y', '2026-10-30': 42 } as EntryMap;
    const t = computeTimeline(habit, entries, TODAY);
    expect(t.days.at(-1)!.date).toBe(TODAY);
    expect(dayInfo(t, '2026-10-30').status).toBe('missed');
    expect(dayInfo(t, '2026-11-05').status).toBe('unknown');
  });
});

describe('X times per week (rolling 7-day window)', () => {
  // Mon 19 Oct – Sun 25 Oct 2026, then Mon 26 Oct
  const habit = makeHabit({
    startDate: '2026-10-19',
    frequency: { kind: 'timesPerWeek', times: 3 },
  });
  const entries = run('2026-10-19', 3); // Mon, Tue, Wed done

  it('needs X done days before auto-ticking', () => {
    expect(statusOf(habit, { '2026-10-19': 'y' }, '2026-10-20')).toBe('missed');
  });

  it('auto-ticks the remaining days once the target is met', () => {
    expect(statusOf(habit, entries, '2026-10-21')).toBe('done');
    for (const d of ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']) {
      expect(statusOf(habit, entries, d)).toBe('autoDone');
    }
    const t = computeTimeline(habit, entries, TODAY);
    expect(dayInfo(t, '2026-10-22').v).toBe(1);
  });

  it('stops auto-ticking when completions slide out of the window', () => {
    // Mon 26 Oct: window is Tue 20 – Mon 26, only 2 done days.
    expect(statusOf(habit, entries, '2026-10-26')).toBe('missed');
  });

  it('never auto-ticks an explicit "no"', () => {
    expect(statusOf(habit, { ...entries, '2026-10-23': 'n' }, '2026-10-23')).toBe('missed');
  });

  it('a skip does not count toward the target', () => {
    const e: EntryMap = { '2026-10-19': 'y', '2026-10-20': 'y', '2026-10-21': 's' };
    expect(statusOf(habit, e, '2026-10-22')).toBe('missed');
  });

  it('today is autoDone (not pending) when the target is already met', () => {
    const t = computeTimeline(habit, entries, '2026-10-23');
    expect(dayInfo(t, '2026-10-23')).toMatchObject({ status: 'autoDone', pending: false, v: 1 });
  });
});

describe('every N days', () => {
  const habit = makeHabit({ startDate: '2026-10-01', frequency: { kind: 'everyNDays', n: 3 } });
  it('covers the next N-1 days after a completion', () => {
    const e: EntryMap = { '2026-10-10': 'y' };
    expect(statusOf(habit, e, '2026-10-10')).toBe('done');
    expect(statusOf(habit, e, '2026-10-11')).toBe('autoDone');
    expect(statusOf(habit, e, '2026-10-12')).toBe('autoDone');
    expect(statusOf(habit, e, '2026-10-13')).toBe('missed');
  });
});

describe('X times per month (rolling 30-day window)', () => {
  const habit = makeHabit({
    startDate: '2026-09-01',
    frequency: { kind: 'timesPerMonth', times: 2 },
  });
  it('auto-ticks for 30 days after the 2nd completion', () => {
    const e: EntryMap = { '2026-09-01': 'y', '2026-09-05': 'y' };
    expect(statusOf(habit, e, '2026-09-04')).toBe('missed');
    expect(statusOf(habit, e, '2026-09-06')).toBe('autoDone');
    expect(statusOf(habit, e, '2026-09-30')).toBe('autoDone'); // window 1 Sep – 30 Sep
    expect(statusOf(habit, e, '2026-10-01')).toBe('missed'); // 1 Sep has left the window
  });
});

describe('entries before startDate', () => {
  it('are shown but not scored; empty days before start stay unknown', () => {
    const habit = makeHabit({ startDate: '2026-10-28' });
    const t = computeTimeline(habit, { '2026-10-20': 'y' }, TODAY);
    expect(t.firstDate).toBe('2026-10-20');
    expect(dayInfo(t, '2026-10-20')).toMatchObject({ status: 'done', v: null });
    expect(dayInfo(t, '2026-10-21')).toMatchObject({ status: 'unknown', v: null });
    expect(dayInfo(t, '2026-10-28').status).toBe('missed');
  });
});

describe('habit starting in the future', () => {
  it('has an empty timeline and every day is unknown', () => {
    const habit = makeHabit({ startDate: '2026-12-01' });
    const t = computeTimeline(habit, {}, TODAY);
    expect(t.days).toEqual([]);
    expect(dayInfo(t, TODAY).status).toBe('unknown');
  });
});

describe('recentDays', () => {
  it('returns the last N days oldest-first, unknown before start', () => {
    const habit = makeHabit({ startDate: '2026-10-31' });
    const days = recentDays(computeTimeline(habit, { '2026-11-01': 'y' }, TODAY), 5);
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(days.map((d) => d.status)).toEqual(['unknown', 'unknown', 'missed', 'done', 'missed']);
  });
});
