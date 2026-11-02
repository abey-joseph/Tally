import { formatCompact, longDate } from './format';
import type { DayInfo } from './status';
import type { Habit } from './types';

/** Screen-reader label for a day box, e.g. "Run, Monday 2 Nov: done". */
const STATUS_LABEL: Record<string, string> = {
  done: 'done',
  autoDone: 'target met',
  skipped: 'skipped',
  missed: 'not done',
  unknown: 'no data',
};

export function describeDay(habit: Habit, day: DayInfo): string {
  const value =
    habit.type === 'numeric' && typeof day.value === 'number'
      ? `${formatCompact(day.value)}${habit.unit ? ` ${habit.unit}` : ''}, `
      : '';
  const status = day.pending ? 'not entered yet' : STATUS_LABEL[day.status];
  return `${habit.name}, ${longDate(day.date)}: ${value}${status}`;
}
