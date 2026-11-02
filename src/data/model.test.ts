import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../lib/types';
import { makeHabit } from '../lib/test-helpers';
import {
  byOrder,
  entryDocId,
  habitToDoc,
  isEntryValue,
  mergeEntryDocs,
  parseFrequency,
  parseHabit,
  parseSettings,
} from './model';

describe('entryDocId', () => {
  it('is one document per habit per year', () => {
    expect(entryDocId('abc', '2026-11-02')).toBe('abc_2026');
    expect(entryDocId('abc', '2027-01-01')).toBe('abc_2027');
  });
});

describe('isEntryValue', () => {
  it('accepts y/n/s and finite numbers only', () => {
    for (const v of ['y', 'n', 's', 0, 2.5, -1]) expect(isEntryValue(v)).toBe(true);
    for (const v of ['x', '', null, undefined, Number.NaN, Infinity, {}, true]) {
      expect(isEntryValue(v)).toBe(false);
    }
  });
});

describe('mergeEntryDocs', () => {
  it('merges year documents per habit and drops invalid data', () => {
    const merged = mergeEntryDocs([
      { habitId: 'a', year: 2025, values: { '2025-12-31': 'y' }, notes: { '2025-12-31': 'nye' } },
      {
        habitId: 'a',
        year: 2026,
        values: { '2026-01-01': 's', 'bad-key': 'y', '2026-01-02': 'x' },
      },
      { habitId: 'b', year: 2026, values: { '2026-03-01': 4.5 }, notes: { '2026-03-01': '  ' } },
      { year: 2026, values: { '2026-01-01': 'y' } }, // no habitId
      null,
      'junk',
    ]);
    expect([...merged.keys()]).toEqual(['a', 'b']);
    expect(merged.get('a')).toEqual({
      values: { '2025-12-31': 'y', '2026-01-01': 's' },
      notes: { '2025-12-31': 'nye' },
    });
    expect(merged.get('b')).toEqual({ values: { '2026-03-01': 4.5 }, notes: {} });
  });
});

describe('parseFrequency', () => {
  it('accepts valid frequencies and rejects out-of-range ones', () => {
    expect(parseFrequency({ kind: 'daily' })).toEqual({ kind: 'daily' });
    expect(parseFrequency({ kind: 'timesPerWeek', times: 3 })).toEqual({
      kind: 'timesPerWeek',
      times: 3,
    });
    expect(parseFrequency({ kind: 'timesPerWeek', times: 8 })).toBeNull();
    expect(parseFrequency({ kind: 'timesPerMonth', times: 31 })).not.toBeNull();
    expect(parseFrequency({ kind: 'everyNDays', n: 1 })).toBeNull();
    expect(parseFrequency({ kind: 'everyNDays', n: 2.5 })).toBeNull();
    expect(parseFrequency({ kind: 'hourly' })).toBeNull();
    expect(parseFrequency(null)).toBeNull();
  });
});

describe('parseHabit', () => {
  it('round-trips a habit through habitToDoc', () => {
    const h = makeHabit({ question: 'Did you run?', description: 'Morning' });
    expect(parseHabit(h.id, habitToDoc(h))).toEqual(h);
    const n = makeHabit({ type: 'numeric', unit: 'km', target: 5.5, targetType: 'atMost' });
    expect(parseHabit(n.id, habitToDoc(n))).toEqual(n);
  });

  it('habitToDoc drops the id and undefined fields', () => {
    const doc = habitToDoc(makeHabit({ question: undefined }));
    expect(doc).not.toHaveProperty('id');
    expect(doc).not.toHaveProperty('question');
  });

  it('rejects documents missing required fields', () => {
    const doc = habitToDoc(makeHabit());
    expect(parseHabit('x', { ...doc, name: '' })).toBeNull();
    expect(parseHabit('x', { ...doc, type: 'other' })).toBeNull();
    expect(parseHabit('x', { ...doc, frequency: { kind: 'nope' } })).toBeNull();
    expect(parseHabit('x', { ...doc, startDate: '2026-02-30' })).toBeNull();
    expect(parseHabit('x', 'junk')).toBeNull();
  });

  it('fills safe defaults for optional fields', () => {
    const h = parseHabit('x', {
      name: 'Read',
      type: 'numeric',
      frequency: { kind: 'daily' },
      startDate: '2026-01-01',
    });
    expect(h).toMatchObject({
      color: '#607d8b',
      order: 0,
      archived: false,
      target: 0,
      targetType: 'atLeast',
    });
  });
});

describe('parseSettings', () => {
  it('returns defaults for missing or invalid data', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(
      parseSettings({ timezone: 'Mars/Base', weekStart: 9, theme: 'pink', daysShown: 0 }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const s = {
      timezone: 'Europe/London',
      weekStart: 0,
      theme: 'dark',
      pureBlack: true,
      daysShown: 7,
      newestFirst: false,
      sortBy: 'score',
      confetti: false,
    };
    expect(parseSettings(s)).toEqual(s);
  });
});

describe('byOrder', () => {
  it('sorts by order then name', () => {
    const list = [
      makeHabit({ id: '1', name: 'B', order: 1 }),
      makeHabit({ id: '2', name: 'A', order: 1 }),
      makeHabit({ id: '3', name: 'Z', order: 0 }),
    ];
    expect(list.sort(byOrder).map((h) => h.id)).toEqual(['3', '2', '1']);
  });
});
