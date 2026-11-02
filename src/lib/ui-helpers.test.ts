import { describe, expect, it } from 'vitest';
import { colorIndex, PALETTE } from './colors';
import { nextBooleanValue } from './cycle';
import {
  dayOfMonth,
  formatCompact,
  formatNumber,
  longDate,
  parseAmount,
  shortDateWithYear,
  weekdayShort,
} from './format';
import { sortHabits } from './sort';
import { makeHabit } from './test-helpers';

describe('palette', () => {
  it('has ~20 unique colours', () => {
    expect(PALETTE.length).toBe(20);
    expect(new Set(PALETTE.map((c) => c.value)).size).toBe(20);
  });
  it('colorIndex is case-insensitive and puts unknown colours last', () => {
    expect(colorIndex('#D32F2F')).toBe(0);
    expect(colorIndex('#123456')).toBe(20);
  });
});

describe('nextBooleanValue', () => {
  it('cycles not entered → done → skipped → cleared', () => {
    expect(nextBooleanValue(undefined)).toBe('y');
    expect(nextBooleanValue('y')).toBe('s');
    expect(nextBooleanValue('s')).toBeNull();
  });
  it('treats an explicit no (or a stray number) like not entered', () => {
    expect(nextBooleanValue('n')).toBe('y');
    expect(nextBooleanValue(3)).toBe('y');
  });
});

describe('format', () => {
  it('date labels', () => {
    expect(weekdayShort('2026-11-02')).toBe('Mon');
    expect(dayOfMonth('2026-11-02')).toBe(2);
    expect(longDate('2026-11-02')).toBe('Monday 2 Nov');
    expect(shortDateWithYear('2026-01-09')).toBe('9 Jan 2026');
  });

  it('formatCompact keeps boxes narrow', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(3)).toBe('3');
    expect(formatCompact(2.5)).toBe('2.5');
    expect(formatCompact(1.234)).toBe('1.23');
    expect(formatCompact(12.34)).toBe('12.3');
    expect(formatCompact(123.4)).toBe('123');
    expect(formatCompact(1234)).toBe('1.2k');
    expect(formatCompact(15000)).toBe('15k');
    expect(formatCompact(2_500_000)).toBe('2.5M');
  });

  it('formatNumber', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57');
    expect(formatNumber(5)).toBe('5');
  });

  it('parseAmount accepts decimals with . or , and rejects junk', () => {
    expect(parseAmount('2.5')).toBe(2.5);
    expect(parseAmount('2,5')).toBe(2.5);
    expect(parseAmount(' 10 ')).toBe(10);
    expect(parseAmount('.5')).toBe(0.5);
    expect(parseAmount('3.')).toBe(3);
    expect(parseAmount('0')).toBe(0);
    for (const bad of ['', 'abc', '-1', '1.2.3', '1e3', ' ']) expect(parseAmount(bad)).toBeNull();
  });
});

describe('sortHabits', () => {
  const a = makeHabit({ id: 'a', name: 'walk', order: 2, color: PALETTE[5].value });
  const b = makeHabit({ id: 'b', name: 'Read', order: 0, color: PALETTE[1].value });
  const c = makeHabit({ id: 'c', name: 'meditate', order: 1, color: '#000000' });
  const scores = new Map([
    ['a', 0.9],
    ['b', 0.2],
    ['c', 0.5],
  ]);
  const ids = (sortBy: Parameters<typeof sortHabits>[1]) =>
    sortHabits([a, b, c], sortBy, scores).map((h) => h.id);

  it('sorts by each mode', () => {
    expect(ids('manual')).toEqual(['b', 'c', 'a']);
    expect(ids('name')).toEqual(['c', 'b', 'a']); // case-insensitive
    expect(ids('score')).toEqual(['a', 'c', 'b']);
    expect(ids('color')).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the input', () => {
    const list = [a, b, c];
    sortHabits(list, 'name', scores);
    expect(list.map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('describeDay', () => {
  it('reads value and status', async () => {
    const { describeDay } = await import('./describe');
    const h = makeHabit({ name: 'Run', type: 'numeric', unit: 'km' });
    const base = { date: '2026-11-02', v: 1, pending: false } as const;
    expect(describeDay(h, { ...base, status: 'done', value: 5 })).toBe(
      'Run, Monday 2 Nov: 5 km, done',
    );
    expect(
      describeDay(makeHabit({ name: 'Read' }), {
        ...base,
        status: 'missed',
        value: undefined,
        pending: true,
      }),
    ).toBe('Read, Monday 2 Nov: not entered yet');
  });
});

describe('describeSchedule', () => {
  it('describes Yes/No and Measurable schedules', async () => {
    const { describeSchedule } = await import('./describe');
    expect(describeSchedule(makeHabit({ frequency: { kind: 'timesPerWeek', times: 3 } }))).toBe(
      '3 times per week',
    );
    expect(describeSchedule(makeHabit({ type: 'numeric', unit: 'km', target: 5 }))).toBe(
      'At least 5 km per day',
    );
    expect(
      describeSchedule(
        makeHabit({
          type: 'numeric',
          target: 2,
          targetType: 'atMost',
          frequency: { kind: 'everyNDays', n: 3 },
        }),
      ),
    ).toBe('At most 2 every 3 days');
    expect(
      describeSchedule(
        makeHabit({
          type: 'numeric',
          target: 10.5,
          unit: 'pages',
          frequency: { kind: 'timesPerWeek', times: 1 },
        }),
      ),
    ).toBe('At least 10.5 pages per week');
  });
});
