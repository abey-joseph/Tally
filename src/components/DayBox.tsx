import type { ReactNode } from 'react';
import type { DayInfo } from '../lib/status';
import { describeDay } from '../lib/describe';
import { formatCompact } from '../lib/format';
import type { Habit } from '../lib/types';
import { CheckIcon, CrossIcon, DashIcon } from './icons';

interface DayBoxProps {
  habit: Habit;
  day: DayInfo;
  onTap: () => void;
}

/** One tappable day cell. Status is shown by icon *and* colour. */
export default function DayBox({ habit, day, onTap }: DayBoxProps) {
  let content: ReactNode = null;

  if (habit.type === 'numeric' && typeof day.value === 'number') {
    const met = day.status === 'done' || day.status === 'autoDone';
    // Target met: bold number on a tinted pill. Not met: plain grey number.
    content = (
      <span
        className={`rounded-md px-1 py-0.5 text-sm tabular-nums ${met ? 'habit-tint font-bold' : 'text-neutral-500 dark:text-neutral-400'}`}
      >
        {formatCompact(day.value)}
      </span>
    );
  } else if (day.status === 'done') {
    content = <CheckIcon size={22} className="habit-fg" />;
  } else if (day.status === 'autoDone') {
    // Auto-tick: thinner and lighter than a real tick (shape + colour, not colour alone).
    content = <CheckIcon size={22} strokeWidth={1.75} className="habit-fg opacity-50" />;
  } else if (day.status === 'skipped') {
    content = <DashIcon size={20} className="text-neutral-400 dark:text-neutral-500" />;
  } else if (day.status === 'missed' && !day.pending) {
    content = <CrossIcon size={16} className="text-neutral-400 dark:text-neutral-600" />;
  }

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={describeDay(habit, day)}
      className="flex h-12 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-500 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
    >
      {content}
    </button>
  );
}
