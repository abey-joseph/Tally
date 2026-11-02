import { describe, expect, it } from 'vitest';
import {
  axisLabel,
  calendarWeeks,
  formatChange,
  monthsBetween,
  orderedWeekdays,
  scoreSeries,
  weekMonthLabels,
} from './charts';
import { dateRange } from './dates';

const scores = dateRange('2026-09-28', '2026-11-02').map((date, i) => ({ date, score: i / 100 }));

describe('scoreSeries', () => {
  it('day zoom is one point per day', () => {
    expect(scoreSeries(scores, 'day')).toHaveLength(36);
  });

  it('takes the score on the last day of each period', () => {
    const weeks = scoreSeries(scores, 'week', 1);
    expect(weeks.map((w) => w.start)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
    expect(weeks[0]!.value).toBeCloseTo(0.06); // Sun 4 Oct = index 6
    expect(weeks.at(-1)!.value).toBeCloseTo(0.35); // today, still in progress
    const months = scoreSeries(scores, 'month');
    expect(months.map((m) => m.start)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    expect(months[1]!.value).toBeCloseTo(0.33); // 31 Oct = index 33
    expect(scoreSeries(scores, 'quarter').map((q) => q.start)).toEqual([
      '2026-07-01',
      '2026-10-01',
    ]);
    expect(scoreSeries(scores, 'year')).toHaveLength(1);
    expect(scoreSeries([], 'month')).toEqual([]);
  });
});

describe('axisLabel', () => {
  it('labels sensibly per zoom', () => {
    expect(axisLabel('2026-11-02', 'day', 0, 1)).toBe('2 Nov'); // Monday
    expect(axisLabel('2026-11-03', 'day', 1, 1)).toBeNull();
    expect(axisLabel('2026-11-01', 'day', 0, 0)).toBe('1 Nov'); // Sunday start
    expect(axisLabel('2026-10-05', 'week', 4)).toBe('5 Oct');
    expect(axisLabel('2026-10-12', 'week', 5)).toBeNull();
    expect(axisLabel('2026-11-01', 'month', 0)).toBe('Nov');
    expect(axisLabel('2027-01-01', 'month', 2)).toBe('Jan ’27');
    expect(axisLabel('2026-10-01', 'quarter', 0)).toBe('Q4 ’26');
    expect(axisLabel('2026-01-01', 'year', 0)).toBe('2026');
  });
});

describe('calendarWeeks', () => {
  it('spans from the first week to the current week', () => {
    const w = calendarWeeks('2026-08-15', '2026-11-02', 1);
    expect(w[0]).toBe('2026-08-10');
    expect(w.at(-1)).toBe('2026-11-02');
    expect(w).toHaveLength(13);
  });

  it('shows at least minWeeks for a new habit', () => {
    const w = calendarWeeks('2026-11-01', '2026-11-02', 1, 8);
    expect(w).toHaveLength(8);
    expect(w.at(-1)).toBe('2026-11-02');
  });

  it('handles a future start date', () => {
    expect(calendarWeeks('2026-12-01', '2026-11-02', 1, 4)).toHaveLength(4);
  });
});

describe('weekMonthLabels', () => {
  it('labels the first column and each column where a new month starts', () => {
    const weeks = calendarWeeks('2026-09-21', '2026-11-02', 1, 1);
    expect(weeks).toEqual([
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
    expect(weekMonthLabels(weeks)).toEqual(['Sep', 'Oct', null, null, null, 'Nov', null]);
  });

  it('includes the year for January', () => {
    expect(weekMonthLabels(['2026-12-21', '2026-12-28'])).toEqual(['Dec', 'Jan 2027']);
  });
});

describe('misc', () => {
  it('orderedWeekdays', () => {
    expect(orderedWeekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(orderedWeekdays(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('monthsBetween', () => {
    expect(monthsBetween('2026-11-15', '2027-01-02')).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
    ]);
  });
  it('formatChange', () => {
    expect(formatChange(0.123)).toBe('+12%');
    expect(formatChange(-0.03)).toBe('−3%');
    expect(formatChange(0.001)).toBe('0%');
  });
});
