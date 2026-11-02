/**
 * Streaks (spec 5.4): consecutive `done` / `autoDone` days.
 * Skipped days neither break a streak nor add to its length. Today, if still
 * pending, doesn't break the current streak either.
 */
import type { Timeline } from './status';
import type { DateStr } from './types';

export interface Streak {
  start: DateStr;
  end: DateStr;
  length: number;
}

export interface StreakSummary {
  /** Length of the streak still running today (0 if none). */
  current: number;
  currentStreak: Streak | null;
  /** Up to `limit` longest streaks, longest first (ties: most recent first). */
  best: Streak[];
}

export function computeStreaks(timeline: Timeline, limit = 5): StreakSummary {
  const all: Streak[] = [];
  let active: Streak | null = null;

  for (const d of timeline.days) {
    if (d.status === 'done' || d.status === 'autoDone') {
      if (active) {
        active.end = d.date;
        active.length++;
      } else {
        active = { start: d.date, end: d.date, length: 1 };
      }
    } else if (d.status === 'skipped' || d.pending) {
      // neutral: keep the streak going without counting the day
    } else if (active) {
      all.push(active);
      active = null;
    }
  }
  if (active) all.push(active);

  const best = [...all]
    .sort((a, b) => b.length - a.length || (a.end < b.end ? 1 : a.end > b.end ? -1 : 0))
    .slice(0, limit);

  return { current: active?.length ?? 0, currentStreak: active, best };
}
