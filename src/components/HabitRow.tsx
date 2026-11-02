import { memo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { dayInfo, type Timeline } from '../lib/status';
import type { DateStr, Habit } from '../lib/types';
import DayBox from './DayBox';
import ScoreRing from './ScoreRing';

interface HabitRowProps {
  habit: Habit;
  score: number;
  timeline: Timeline;
  dates: DateStr[];
  onTapDay: (habit: Habit, date: DateStr) => void;
}

function HabitRow({ habit, score, timeline, dates, onTapDay }: HabitRowProps) {
  return (
    <li
      style={{ '--habit': habit.color } as CSSProperties}
      className={`flex items-center gap-1 border-b border-neutral-100 py-1 last:border-b-0 dark:border-neutral-800 ${habit.archived ? 'opacity-50' : ''}`}
    >
      <Link
        to={`/habit/${habit.id}`}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg pr-1 pl-1 focus-visible:outline-2 focus-visible:outline-neutral-500"
      >
        <span className="habit-fg flex">
          <ScoreRing score={score} decorative />
        </span>
        <span className="truncate text-base font-medium">{habit.name}</span>
        <span className="sr-only">
          , score {Math.round(score * 100)}%{habit.archived ? ', archived' : ''}
        </span>
      </Link>
      <div className="flex shrink-0">
        {dates.map((date) => (
          <DayBox
            key={date}
            habit={habit}
            day={dayInfo(timeline, date)}
            onTap={() => onTapDay(habit, date)}
          />
        ))}
      </div>
    </li>
  );
}

export default memo(HabitRow);
