import { describe, expect, it } from 'vitest';
import { emptyForm, formFromHabit, suggestColor, validateForm, type HabitForm } from './habitForm';
import { TODAY, makeHabit } from './test-helpers';

const form = (over: Partial<HabitForm> = {}): HabitForm => ({
  ...emptyForm('boolean', TODAY, '#388e3c'),
  name: 'Meditate',
  ...over,
});

describe('emptyForm', () => {
  it('defaults to daily, starting today', () => {
    const f = emptyForm('numeric', TODAY, '#d32f2f');
    expect(f).toMatchObject({
      type: 'numeric',
      freqKind: 'daily',
      startDate: TODAY,
      color: '#d32f2f',
    });
  });
});

describe('validateForm', () => {
  it('builds a Yes/No daily habit with trimmed text and no numeric fields', () => {
    const { errors, fields } = validateForm(
      form({ name: '  Meditate ', question: ' Did you meditate? ', description: '' }),
      TODAY,
    );
    expect(errors).toEqual({});
    expect(fields).toEqual({
      type: 'boolean',
      name: 'Meditate',
      question: 'Did you meditate?',
      description: undefined,
      color: '#388e3c',
      frequency: { kind: 'daily' },
      unit: undefined,
      target: undefined,
      targetType: undefined,
      startDate: TODAY,
    });
  });

  it('builds each Yes/No frequency', () => {
    const f = (o: Partial<HabitForm>) => validateForm(form(o), TODAY).fields?.frequency;
    expect(f({ freqKind: 'timesPerWeek', weekTimes: '3' })).toEqual({
      kind: 'timesPerWeek',
      times: 3,
    });
    expect(f({ freqKind: 'timesPerMonth', monthTimes: '10' })).toEqual({
      kind: 'timesPerMonth',
      times: 10,
    });
    expect(f({ freqKind: 'everyNDays', n: '3' })).toEqual({ kind: 'everyNDays', n: 3 });
  });

  it('rejects out-of-range frequencies', () => {
    expect(
      validateForm(form({ freqKind: 'timesPerWeek', weekTimes: '8' }), TODAY).errors.times,
    ).toMatch(/1 to 7/);
    expect(
      validateForm(form({ freqKind: 'timesPerWeek', weekTimes: '0' }), TODAY).errors.times,
    ).toBeDefined();
    expect(
      validateForm(form({ freqKind: 'timesPerMonth', monthTimes: '2.5' }), TODAY).errors.times,
    ).toMatch(/1 to 31/);
    expect(validateForm(form({ freqKind: 'everyNDays', n: '1' }), TODAY).errors.n).toMatch(
      /2 to 30/,
    );
    expect(validateForm(form({ freqKind: 'everyNDays', n: '31' }), TODAY).errors.n).toBeDefined();
  });

  it('ignores the hidden times field for unrelated frequencies', () => {
    expect(
      validateForm(
        form({ freqKind: 'daily', weekTimes: 'junk', monthTimes: 'x', n: 'junk' }),
        TODAY,
      ).errors,
    ).toEqual({});
  });

  it('requires a name and enforces length limits', () => {
    expect(validateForm(form({ name: '   ' }), TODAY).errors.name).toMatch(/name/);
    expect(validateForm(form({ name: 'x'.repeat(61) }), TODAY).errors.name).toMatch(/60/);
    expect(validateForm(form({ question: 'x'.repeat(121) }), TODAY).errors.question).toBeDefined();
  });

  it('allows backdating but not future start dates', () => {
    expect(validateForm(form({ startDate: '2025-01-01' }), TODAY).fields?.startDate).toBe(
      '2025-01-01',
    );
    expect(validateForm(form({ startDate: '2026-11-03' }), TODAY).errors.startDate).toMatch(
      /future/,
    );
    expect(validateForm(form({ startDate: '' }), TODAY).errors.startDate).toMatch(/valid/);
  });

  describe('Measurable', () => {
    const num = (o: Partial<HabitForm>) =>
      form({ type: 'numeric', name: 'Run', unit: 'km', target: '5', ...o });

    it('builds an at-least daily habit with decimals', () => {
      const { fields } = validateForm(num({ target: '2,5' }), TODAY);
      expect(fields).toMatchObject({
        type: 'numeric',
        unit: 'km',
        target: 2.5,
        targetType: 'atLeast',
        frequency: { kind: 'daily' },
      });
    });

    it('weekly / monthly are stored as one period, ignoring the times field', () => {
      expect(
        validateForm(num({ freqKind: 'timesPerWeek', weekTimes: '99' }), TODAY).fields?.frequency,
      ).toEqual({
        kind: 'timesPerWeek',
        times: 1,
      });
      expect(validateForm(num({ freqKind: 'timesPerMonth' }), TODAY).fields?.frequency).toEqual({
        kind: 'timesPerMonth',
        times: 1,
      });
    });

    it('requires a valid target; 0 is allowed only for "at most"', () => {
      expect(validateForm(num({ target: '' }), TODAY).errors.target).toBeDefined();
      expect(validateForm(num({ target: 'abc' }), TODAY).errors.target).toBeDefined();
      expect(validateForm(num({ target: '0' }), TODAY).errors.target).toMatch(/more than 0/);
      expect(validateForm(num({ target: '0', targetType: 'atMost' }), TODAY).fields?.target).toBe(
        0,
      );
    });

    it('unit is optional but limited in length', () => {
      expect(validateForm(num({ unit: '' }), TODAY).fields?.unit).toBeUndefined();
      expect(validateForm(num({ unit: 'x'.repeat(16) }), TODAY).errors.unit).toBeDefined();
    });
  });
});

describe('week and month counts', () => {
  it('are independent', () => {
    const f = form({ weekTimes: '4' });
    expect(f.monthTimes).toBe('10');
    expect(validateForm({ ...f, freqKind: 'timesPerMonth' }, TODAY).fields?.frequency).toEqual({
      kind: 'timesPerMonth',
      times: 10,
    });
  });
});

describe('formFromHabit', () => {
  it('round-trips through validateForm', () => {
    const habits = [
      makeHabit({
        question: 'Q?',
        description: 'D',
        frequency: { kind: 'timesPerWeek', times: 4 },
      }),
      makeHabit({ frequency: { kind: 'everyNDays', n: 5 } }),
      makeHabit({
        type: 'numeric',
        unit: 'pages',
        target: 20,
        targetType: 'atMost',
        frequency: { kind: 'timesPerMonth', times: 1 },
      }),
    ];
    for (const h of habits) {
      const { fields } = validateForm(formFromHabit(h), TODAY);
      const { id: _id, order: _o, createdAt: _c, archived: _a, ...rest } = h;
      expect(fields).toEqual({
        question: undefined,
        description: undefined,
        unit: undefined,
        target: undefined,
        targetType: undefined,
        ...rest,
      });
    }
  });
});

describe('suggestColor', () => {
  it('picks the first unused palette colour, then cycles', () => {
    const pal = ['#a', '#b', '#c'];
    expect(suggestColor(pal, [])).toBe('#a');
    expect(suggestColor(pal, ['#A', '#c'])).toBe('#b');
    expect(suggestColor(pal, ['#a', '#b', '#c', '#a'])).toBe('#b');
  });
});
