import { colorIndex } from './colors';
import type { Habit, SortBy } from './types';

/** Sorts habits for the main list. Ties fall back to the manual order. */
export function sortHabits(habits: Habit[], sortBy: SortBy, scores: Map<string, number>): Habit[] {
  const manual = (a: Habit, b: Habit) => a.order - b.order || a.name.localeCompare(b.name);
  const cmp: Record<SortBy, (a: Habit, b: Habit) => number> = {
    manual,
    name: (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || manual(a, b),
    score: (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || manual(a, b),
    color: (a, b) => colorIndex(a.color) - colorIndex(b.color) || manual(a, b),
  };
  return [...habits].sort(cmp[sortBy]);
}
