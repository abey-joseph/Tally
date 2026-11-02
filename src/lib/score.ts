/**
 * Habit strength score (spec 5.2): an exponential moving average, 0–1.
 *
 *   freq  = X / N
 *   m     = 0.5 ^ (sqrt(freq) / 13)
 *   score = score_yesterday * m + v_today * (1 − m)
 *
 * Starts at 0 on the day before `startDate`. Days whose `v` is null (skipped,
 * before start, today not yet entered) leave the score unchanged.
 */
import { diffDays } from './dates';
import { frequencyRatio } from './frequency';
import type { Timeline } from './status';
import type { DateStr, Frequency } from './types';

export function scoreMultiplier(freq: Frequency): number {
  return Math.pow(0.5, Math.sqrt(frequencyRatio(freq)) / 13);
}

export interface ScorePoint {
  date: DateStr;
  score: number;
}

/** One score per day in the timeline (days before `startDate` are 0). */
export function computeScores(timeline: Timeline, freq: Frequency): ScorePoint[] {
  const m = scoreMultiplier(freq);
  let score = 0;
  return timeline.days.map((d) => {
    if (d.v !== null) score = score * m + d.v * (1 - m);
    return { date: d.date, score };
  });
}

/** Score on a given date (0 before the timeline starts, latest score after it ends). */
export function scoreOn(scores: ScorePoint[], date: DateStr): number {
  if (scores.length === 0) return 0;
  const first = scores[0]!;
  const i = diffDays(date, first.date);
  if (i < 0) return 0;
  return (scores[Math.min(i, scores.length - 1)] ?? first).score;
}

export function currentScore(scores: ScorePoint[]): number {
  return scores.length ? scores[scores.length - 1]!.score : 0;
}
