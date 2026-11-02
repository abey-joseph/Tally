import { describe, expect, it } from 'vitest';
import { completesToday } from './celebrate';
import { TODAY, makeHabit } from './test-helpers';

describe('completesToday', () => {
  const yesNo = makeHabit({ startDate: '2026-10-01' });
  const run = makeHabit({
    type: 'numeric',
    startDate: '2026-10-01',
    target: 5,
    targetType: 'atLeast',
  });

  it('celebrates ticking today', () => {
    expect(completesToday(yesNo, {}, TODAY, 'y', TODAY)).toBe(true);
  });
  it('not for past days, skips, clearing, or re-ticking', () => {
    expect(completesToday(yesNo, {}, '2026-11-01', 'y', TODAY)).toBe(false);
    expect(completesToday(yesNo, {}, TODAY, 's', TODAY)).toBe(false);
    expect(completesToday(yesNo, { [TODAY]: 'y' }, TODAY, null, TODAY)).toBe(false);
    expect(completesToday(yesNo, { [TODAY]: 'y' }, TODAY, 'y', TODAY)).toBe(false);
  });
  it('measurable: only when the value reaches the target', () => {
    expect(completesToday(run, {}, TODAY, 3, TODAY)).toBe(false);
    expect(completesToday(run, {}, TODAY, 5, TODAY)).toBe(true);
    expect(completesToday(run, { [TODAY]: 6 }, TODAY, 7, TODAY)).toBe(false); // already done
  });
});
