import { computeTimeline, dayInfo } from './status';
import type { DateStr, EntryMap, EntryValue, Habit } from './types';

/**
 * True when setting `value` for today turns today into a real "done"
 * (a Yes tick, or a measurable value that reaches the target) — i.e. worth a confetti burst.
 */
export function completesToday(
  habit: Habit,
  values: EntryMap,
  date: DateStr,
  value: EntryValue | null,
  today: DateStr,
): boolean {
  if (date !== today || value === null || value === 's' || value === 'n') return false;
  const before = dayInfo(computeTimeline(habit, values, today), today).status;
  const after = dayInfo(computeTimeline(habit, { ...values, [today]: value }, today), today).status;
  return before !== 'done' && after === 'done';
}
