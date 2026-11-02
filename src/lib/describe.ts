import { formatCompact, formatNumber, longDate } from './format';
import { describeFrequency } from './frequency';
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

/** "At least 5 km per day", "3 times per week", "Every 2 days". */
export function describeSchedule(habit: Habit): string {
  if (habit.type === 'boolean') return describeFrequency(habit.frequency);
  const f = habit.frequency;
  const period =
    f.kind === 'daily'
      ? 'per day'
      : f.kind === 'timesPerWeek'
        ? 'per week'
        : f.kind === 'timesPerMonth'
          ? 'per month'
          : `every ${f.n} days`;
  const amount = `${formatNumber(habit.target ?? 0)}${habit.unit ? ` ${habit.unit}` : ''}`;
  return `${habit.targetType === 'atMost' ? 'At most' : 'At least'} ${amount} ${period}`;
}
