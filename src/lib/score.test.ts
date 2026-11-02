import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeScores, currentScore, scoreMultiplier, scoreOn } from './score';
import { computeTimeline } from './status';
import { TODAY, makeHabit, run } from './test-helpers';
import type { EntryMap, Habit } from './types';

/** Score at the end of `today` for a habit. */
function scoreFor(habit: Habit, entries: EntryMap, today: string): number {
  return currentScore(computeScores(computeTimeline(habit, entries, today), habit.frequency));
}

describe('scoreMultiplier', () => {
  it('matches m = 0.5 ^ (sqrt(X/N) / 13)', () => {
    expect(scoreMultiplier({ kind: 'daily' })).toBeCloseTo(Math.pow(0.5, 1 / 13), 12);
    expect(scoreMultiplier({ kind: 'timesPerWeek', times: 3 })).toBeCloseTo(
      Math.pow(0.5, Math.sqrt(3 / 7) / 13),
      12,
    );
  });

  it('less frequent habits move more slowly', () => {
    expect(scoreMultiplier({ kind: 'everyNDays', n: 7 })).toBeGreaterThan(
      scoreMultiplier({ kind: 'daily' }),
    );
  });
});

describe('daily Yes/No score', () => {
  const start = '2026-01-01';
  const habit = makeHabit({ startDate: start });
  const m = scoreMultiplier({ kind: 'daily' });

  it('starts at 0 and the first done day gives exactly 1 − m', () => {
    expect(scoreFor(habit, { [start]: 'y' }, start)).toBeCloseTo(1 - m, 12);
  });

  it('done every day for 90 days reaches 95%+', () => {
    const end = addDays(start, 89);
    const s = scoreFor(habit, run(start, 90), end);
    expect(s).toBeGreaterThan(0.95);
    expect(s).toBeLessThan(1);
    expect(s).toBeCloseTo(1 - Math.pow(m, 90), 10);
  });

  it('a long streak followed by 2–3 misses still leaves a high score', () => {
    const entries = { ...run(start, 100), ...run(addDays(start, 100), 3, 'n') };
    const after100 = scoreFor(habit, entries, addDays(start, 99));
    const after2Misses = scoreFor(habit, entries, addDays(start, 101));
    const after3Misses = scoreFor(habit, entries, addDays(start, 102));
    expect(after100).toBeGreaterThan(0.99);
    expect(after2Misses).toBeGreaterThan(0.85);
    expect(after3Misses).toBeGreaterThan(0.8);
    expect(after3Misses).toBeLessThan(after2Misses);
    expect(after3Misses).toBeCloseTo(after100 * Math.pow(m, 3), 10);
  });

  it('recovers after misses when the habit is resumed', () => {
    const entries = { ...run(start, 60), ...run(addDays(start, 63), 30) };
    const dip = scoreFor(habit, entries, addDays(start, 62));
    const recovered = scoreFor(habit, entries, addDays(start, 92));
    expect(recovered).toBeGreaterThan(dip);
    expect(recovered).toBeGreaterThan(0.9);
  });

  it('skipped days leave the score unchanged', () => {
    const base = run(start, 30);
    const before = scoreFor(habit, base, addDays(start, 29));
    const withSkips = { ...base, ...run(addDays(start, 30), 5, 's') };
    expect(scoreFor(habit, withSkips, addDays(start, 34))).toBeCloseTo(before, 12);
  });

  it('never entering anything keeps the score at 0', () => {
    expect(scoreFor(habit, {}, addDays(start, 200))).toBe(0);
  });

  it('an un-entered today does not lower the score until the day is over', () => {
    const entries = run(start, 30);
    const yesterday = addDays(start, 29);
    const today = addDays(start, 30);
    expect(scoreFor(habit, entries, today)).toBeCloseTo(scoreFor(habit, entries, yesterday), 12);
    expect(scoreFor(habit, { ...entries, [today]: 'n' }, today)).toBeLessThan(
      scoreFor(habit, entries, yesterday),
    );
  });

  it('days before startDate are not scored, even with entries', () => {
    const h = makeHabit({ startDate: '2026-02-01' });
    const s = computeScores(computeTimeline(h, run('2026-01-20', 13), '2026-02-01'), h.frequency);
    expect(scoreOn(s, '2026-01-31')).toBe(0);
    expect(scoreOn(s, '2026-02-01')).toBeCloseTo(1 - m, 12);
  });
});

describe('X per week score', () => {
  it('Mon/Wed/Fri every week for a 3×/week habit approaches 100% thanks to auto-ticks', () => {
    const habit = makeHabit({
      startDate: '2026-01-05', // Monday
      frequency: { kind: 'timesPerWeek', times: 3 },
    });
    const entries: EntryMap = {};
    for (let w = 0; w < 26; w++) {
      for (const d of [0, 2, 4]) entries[addDays('2026-01-05', w * 7 + d)] = 'y';
    }
    expect(scoreFor(habit, entries, addDays('2026-01-05', 26 * 7 - 1))).toBeGreaterThan(0.95);
  });

  it('once a week on a 3×/week habit stays low', () => {
    // Only the done day itself scores 1; the other 6 days of each window are misses.
    const habit = makeHabit({
      startDate: '2026-01-05',
      frequency: { kind: 'timesPerWeek', times: 3 },
    });
    const entries: EntryMap = {};
    for (let w = 0; w < 26; w++) entries[addDays('2026-01-05', w * 7)] = 'y';
    expect(scoreFor(habit, entries, addDays('2026-01-05', 26 * 7 - 1))).toBeLessThan(0.2);
  });
});

describe('numeric score', () => {
  const start = '2026-01-01';

  it('at-least: half the target every day converges to ~50%', () => {
    const habit = makeHabit({
      type: 'numeric',
      startDate: start,
      target: 10,
      targetType: 'atLeast',
    });
    const s = scoreFor(habit, run(start, 200, 5), addDays(start, 199));
    expect(s).toBeGreaterThan(0.49);
    expect(s).toBeLessThan(0.5);
  });

  it('at-least: meeting the target every day behaves like a daily Yes/No habit', () => {
    const numeric = makeHabit({
      type: 'numeric',
      startDate: start,
      target: 3,
      targetType: 'atLeast',
    });
    const bool = makeHabit({ startDate: start });
    const end = addDays(start, 59);
    expect(scoreFor(numeric, run(start, 60, 3.5), end)).toBeCloseTo(
      scoreFor(bool, run(start, 60), end),
      12,
    );
  });

  it('at-most: staying under the limit builds the score, going over lowers it', () => {
    const habit = makeHabit({ type: 'numeric', startDate: start, target: 2, targetType: 'atMost' });
    const good = run(start, 60, 1);
    const sGood = scoreFor(habit, good, addDays(start, 59));
    expect(sGood).toBeGreaterThan(0.95);
    const bad = { ...good, ...run(addDays(start, 60), 3, 5) };
    const sBad = scoreFor(habit, bad, addDays(start, 62));
    expect(sBad).toBeLessThan(sGood);
    expect(sBad).toBeGreaterThan(0.8); // a few bad days don't wipe it out
  });
});

describe('scoreOn', () => {
  const habit = makeHabit({ startDate: '2026-10-01' });
  const scores = computeScores(
    computeTimeline(habit, run('2026-10-01', 10), TODAY),
    habit.frequency,
  );

  it('returns 0 before the series and the latest value after it', () => {
    expect(scoreOn(scores, '2026-09-01')).toBe(0);
    expect(scoreOn(scores, '2027-01-01')).toBe(currentScore(scores));
    expect(scoreOn([], TODAY)).toBe(0);
  });

  it('looks up a specific day', () => {
    expect(scoreOn(scores, '2026-10-10')).toBe(scores[9]!.score);
  });
});
