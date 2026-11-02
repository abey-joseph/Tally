import { describe, expect, it } from 'vitest';
import { computeTimeline, dayInfo } from './status';
import { TODAY, makeHabit } from './test-helpers';
import type { EntryMap, Habit } from './types';

const info = (habit: Habit, entries: EntryMap, date: string) =>
  dayInfo(computeTimeline(habit, entries, TODAY), date);

describe('numeric "at least", daily', () => {
  const habit = makeHabit({
    type: 'numeric',
    startDate: '2026-10-01',
    unit: 'km',
    target: 5,
    targetType: 'atLeast',
  });

  it('meeting the target is done with v = 1', () => {
    expect(info(habit, { '2026-10-10': 5 }, '2026-10-10')).toMatchObject({ status: 'done', v: 1 });
  });

  it('exceeding the target is capped at v = 1', () => {
    expect(info(habit, { '2026-10-10': 12 }, '2026-10-10').v).toBe(1);
  });

  it('partial progress gives a fractional v but is still missed', () => {
    expect(info(habit, { '2026-10-10': 2.5 }, '2026-10-10')).toMatchObject({
      status: 'missed',
      v: 0.5,
    });
  });

  it('zero or nothing entered is missed with v = 0', () => {
    expect(info(habit, { '2026-10-10': 0 }, '2026-10-10')).toMatchObject({
      status: 'missed',
      v: 0,
    });
    expect(info(habit, {}, '2026-10-10')).toMatchObject({ status: 'missed', v: 0 });
  });

  it('skipped holds the score', () => {
    expect(info(habit, { '2026-10-10': 's' }, '2026-10-10')).toMatchObject({
      status: 'skipped',
      v: null,
    });
  });

  it('ignores Yes/No values on a numeric habit', () => {
    expect(info(habit, { '2026-10-10': 'y' }, '2026-10-10')).toMatchObject({ status: 'missed' });
  });
});

describe('numeric "at least", weekly window (decimals)', () => {
  // 10 km per week
  const habit = makeHabit({
    type: 'numeric',
    startDate: '2026-10-01',
    frequency: { kind: 'timesPerWeek', times: 1 },
    target: 10,
    targetType: 'atLeast',
  });
  const entries: EntryMap = { '2026-10-05': 4, '2026-10-06': 3.5, '2026-10-07': 2.5 };

  it('accumulates over the rolling window', () => {
    expect(info(habit, entries, '2026-10-05')).toMatchObject({ status: 'missed', v: 0.4 });
    expect(info(habit, entries, '2026-10-06')).toMatchObject({ status: 'missed', v: 0.75 });
    expect(info(habit, entries, '2026-10-07')).toMatchObject({ status: 'done', v: 1 });
  });

  it('auto-ticks un-entered days while the window total still meets the target', () => {
    expect(info(habit, entries, '2026-10-08')).toMatchObject({ status: 'autoDone', v: 1 });
    expect(info(habit, entries, '2026-10-11')).toMatchObject({ status: 'autoDone', v: 1 });
  });

  it('drops back once early values leave the window', () => {
    // 12 Oct window = 6–12 Oct → 3.5 + 2.5 = 6
    expect(info(habit, entries, '2026-10-12')).toMatchObject({ status: 'missed', v: 0.6 });
  });

  it('a 0 entry inside a met window counts as autoDone, not done', () => {
    expect(info(habit, { ...entries, '2026-10-09': 0 }, '2026-10-09').status).toBe('autoDone');
  });
});

describe('numeric "at most"', () => {
  const daily = makeHabit({
    type: 'numeric',
    startDate: '2026-10-01',
    unit: 'coffees',
    target: 2,
    targetType: 'atMost',
  });

  it('within the limit is done with v = 1', () => {
    expect(info(daily, { '2026-10-10': 1 }, '2026-10-10')).toMatchObject({ status: 'done', v: 1 });
    expect(info(daily, { '2026-10-10': 2 }, '2026-10-10')).toMatchObject({ status: 'done', v: 1 });
    expect(info(daily, { '2026-10-10': 0 }, '2026-10-10')).toMatchObject({ status: 'done', v: 1 });
  });

  it('over the limit is missed with v = 0', () => {
    expect(info(daily, { '2026-10-10': 2.5 }, '2026-10-10')).toMatchObject({
      status: 'missed',
      v: 0,
    });
  });

  it('nothing entered counts as 0 → autoDone (faded tick)', () => {
    expect(info(daily, {}, '2026-10-10')).toMatchObject({ status: 'autoDone', v: 1 });
  });

  it('weekly limit: a big day makes the following un-entered days missed', () => {
    const weekly = { ...daily, frequency: { kind: 'timesPerWeek', times: 1 } as const, target: 3 };
    const e: EntryMap = { '2026-10-05': 2, '2026-10-06': 2 };
    expect(info(weekly, e, '2026-10-05').status).toBe('done');
    expect(info(weekly, e, '2026-10-06')).toMatchObject({ status: 'missed', v: 0 }); // 4 > 3
    expect(info(weekly, e, '2026-10-10')).toMatchObject({ status: 'missed', v: 0 }); // still 4
    expect(info(weekly, e, '2026-10-12')).toMatchObject({ status: 'autoDone', v: 1 }); // window 6–12 → 2
  });
});
