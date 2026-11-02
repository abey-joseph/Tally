import { describe, expect, it } from 'vitest';
import { describeFrequency, frequencyRatio, toWindow } from './frequency';

describe('toWindow: every frequency becomes "X times in N days"', () => {
  it('maps each kind', () => {
    expect(toWindow({ kind: 'daily' })).toEqual({ times: 1, days: 1 });
    expect(toWindow({ kind: 'timesPerWeek', times: 3 })).toEqual({ times: 3, days: 7 });
    expect(toWindow({ kind: 'timesPerMonth', times: 10 })).toEqual({ times: 10, days: 30 });
    expect(toWindow({ kind: 'everyNDays', n: 3 })).toEqual({ times: 1, days: 3 });
  });

  it('clamps out-of-range values', () => {
    expect(toWindow({ kind: 'timesPerWeek', times: 0 })).toEqual({ times: 1, days: 7 });
    expect(toWindow({ kind: 'timesPerWeek', times: 9 })).toEqual({ times: 7, days: 7 });
    expect(toWindow({ kind: 'timesPerMonth', times: 99 })).toEqual({ times: 31, days: 30 });
    expect(toWindow({ kind: 'everyNDays', n: 100 })).toEqual({ times: 1, days: 30 });
    expect(toWindow({ kind: 'everyNDays', n: Number.NaN })).toEqual({ times: 1, days: 1 });
  });
});

describe('frequencyRatio', () => {
  it('is X / N, capped at 1', () => {
    expect(frequencyRatio({ kind: 'daily' })).toBe(1);
    expect(frequencyRatio({ kind: 'timesPerWeek', times: 3 })).toBeCloseTo(3 / 7);
    expect(frequencyRatio({ kind: 'timesPerMonth', times: 31 })).toBe(1);
    expect(frequencyRatio({ kind: 'everyNDays', n: 4 })).toBe(0.25);
  });
});

describe('describeFrequency', () => {
  it('reads naturally', () => {
    expect(describeFrequency({ kind: 'daily' })).toBe('Every day');
    expect(describeFrequency({ kind: 'timesPerWeek', times: 1 })).toBe('Once per week');
    expect(describeFrequency({ kind: 'timesPerWeek', times: 2 })).toBe('Twice per week');
    expect(describeFrequency({ kind: 'timesPerWeek', times: 3 })).toBe('3 times per week');
    expect(describeFrequency({ kind: 'timesPerWeek', times: 7 })).toBe('Every day');
    expect(describeFrequency({ kind: 'timesPerMonth', times: 10 })).toBe('10 times per month');
    expect(describeFrequency({ kind: 'everyNDays', n: 3 })).toBe('Every 3 days');
  });
});
