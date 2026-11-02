import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  addYears,
  dateRange,
  diffDays,
  fromDayNum,
  isEditable,
  isValidDateStr,
  isValidTimezone,
  monthKey,
  nextPeriodStart,
  startOfMonth,
  startOfPeriod,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  toDayNum,
  todayIn,
  weekdayOf,
  yearOf,
} from './dates';

describe('day numbers', () => {
  it('round-trips and anchors at the Unix epoch', () => {
    expect(toDayNum('1970-01-01')).toBe(0);
    expect(fromDayNum(0)).toBe('1970-01-01');
    for (const d of ['2024-02-29', '2026-11-02', '1999-12-31', '2030-03-31']) {
      expect(fromDayNum(toDayNum(d))).toBe(d);
    }
  });

  it('rejects malformed strings', () => {
    expect(() => toDayNum('2026-1-2')).toThrow();
  });
});

describe('addDays / diffDays / dateRange', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('diffDays is signed', () => {
    expect(diffDays('2026-11-02', '2026-10-26')).toBe(7);
    expect(diffDays('2026-10-26', '2026-11-02')).toBe(-7);
    expect(diffDays('2027-01-01', '2026-01-01')).toBe(365);
  });

  it('dateRange is inclusive and empty when reversed', () => {
    expect(dateRange('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(dateRange('2026-11-02', '2026-11-01')).toEqual([]);
  });
});

describe('isValidDateStr', () => {
  it('accepts real dates only', () => {
    expect(isValidDateStr('2024-02-29')).toBe(true);
    expect(isValidDateStr('2025-02-29')).toBe(false);
    expect(isValidDateStr('2026-13-01')).toBe(false);
    expect(isValidDateStr('2026-11-2')).toBe(false);
    expect(isValidDateStr('hello')).toBe(false);
  });
});

describe('todayIn (Singapore dates regardless of device time zone)', () => {
  it('rolls over at Singapore midnight (UTC+8)', () => {
    expect(todayIn('Asia/Singapore', new Date('2026-11-01T15:59:59Z'))).toBe('2026-11-01');
    expect(todayIn('Asia/Singapore', new Date('2026-11-01T16:00:00Z'))).toBe('2026-11-02');
  });

  it('defaults to Singapore', () => {
    expect(todayIn(undefined, new Date('2026-11-01T16:30:00Z'))).toBe('2026-11-02');
  });

  it('honours another zone when configured', () => {
    expect(todayIn('America/New_York', new Date('2026-11-02T03:00:00Z'))).toBe('2026-11-01');
  });

  it('falls back to Singapore on an invalid zone', () => {
    expect(todayIn('Not/AZone', new Date('2026-11-01T16:30:00Z'))).toBe('2026-11-02');
    expect(isValidTimezone('Not/AZone')).toBe(false);
    expect(isValidTimezone('Asia/Singapore')).toBe(true);
  });
});

describe('weeks, months, quarters, years', () => {
  it('weekdayOf: 0 = Sunday', () => {
    expect(weekdayOf('2026-11-02')).toBe(1); // Monday
    expect(weekdayOf('2026-11-01')).toBe(0); // Sunday
    expect(weekdayOf('1970-01-01')).toBe(4); // Thursday
    expect(weekdayOf('1969-12-28')).toBe(0); // negative day numbers work
  });

  it('startOfWeek with Monday and Sunday starts', () => {
    expect(startOfWeek('2026-11-02', 1)).toBe('2026-11-02');
    expect(startOfWeek('2026-11-08', 1)).toBe('2026-11-02'); // Sunday → previous Monday
    expect(startOfWeek('2026-11-04', 0)).toBe('2026-11-01');
    expect(startOfWeek('2026-11-01', 0)).toBe('2026-11-01');
  });

  it('month / quarter / year starts and keys', () => {
    expect(startOfMonth('2026-11-17')).toBe('2026-11-01');
    expect(startOfQuarter('2026-11-17')).toBe('2026-10-01');
    expect(startOfQuarter('2026-03-31')).toBe('2026-01-01');
    expect(startOfQuarter('2026-04-01')).toBe('2026-04-01');
    expect(startOfYear('2026-11-17')).toBe('2026-01-01');
    expect(monthKey('2026-11-17')).toBe('2026-11');
    expect(yearOf('2026-11-17')).toBe(2026);
  });

  it('addMonths clamps to the end of shorter months', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2024-03-31', -1)).toBe('2024-02-29');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-11-02', 13)).toBe('2027-12-02');
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
    expect(addYears('2026-11-02', -1)).toBe('2025-11-02');
  });

  it('startOfPeriod / nextPeriodStart', () => {
    expect(startOfPeriod('2026-11-05', 'week')).toBe('2026-11-02');
    expect(startOfPeriod('2026-11-05', 'month')).toBe('2026-11-01');
    expect(startOfPeriod('2026-11-05', 'quarter')).toBe('2026-10-01');
    expect(startOfPeriod('2026-11-05', 'year')).toBe('2026-01-01');
    expect(nextPeriodStart('2026-11-02', 'week')).toBe('2026-11-09');
    expect(nextPeriodStart('2026-11-01', 'month')).toBe('2026-12-01');
    expect(nextPeriodStart('2026-10-01', 'quarter')).toBe('2027-01-01');
    expect(nextPeriodStart('2026-01-01', 'year')).toBe('2027-01-01');
  });
});

describe('isEditable', () => {
  it('allows today and the past, never the future', () => {
    expect(isEditable('2026-11-02', '2026-11-02')).toBe(true);
    expect(isEditable('2020-01-01', '2026-11-02')).toBe(true);
    expect(isEditable('2026-11-03', '2026-11-02')).toBe(false);
  });
});
