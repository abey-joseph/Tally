import { useMemo } from 'react';
import { calendarWeeks, orderedWeekdays, weekMonthLabels } from '../../lib/charts';
import { addDays } from '../../lib/dates';
import { describeDay } from '../../lib/describe';
import { dayOfMonth, weekdayShort } from '../../lib/format';
import { dayInfo, type DayInfo, type Timeline } from '../../lib/status';
import type { DateStr, Habit, Weekday } from '../../lib/types';
import { Card, ScrollToEnd } from './common';

const CELL = 'h-10 w-10 rounded-lg text-xs tabular-nums';

/** Visual style per status — each differs by fill pattern, not just colour. */
function cellClass(day: DayInfo, isToday: boolean): string {
  const ring = isToday ? ' ring-2 ring-neutral-900 dark:ring-neutral-100' : '';
  switch (day.status) {
    case 'done':
      return `habit-bg-strong font-semibold text-white${ring}`;
    case 'autoDone':
      return `habit-tint${ring}`;
    case 'skipped':
      return `cal-skip text-neutral-600 dark:text-neutral-300${ring}`;
    case 'missed':
      return day.pending
        ? `border-2 border-dashed border-neutral-300 text-neutral-500 dark:border-neutral-600${ring}`
        : `bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400${ring}`;
    default:
      return `text-neutral-400 dark:text-neutral-600${ring}`;
  }
}

export default function CalendarCard({
  habit,
  timeline,
  weekStart,
  onTapDay,
}: {
  habit: Habit;
  timeline: Timeline;
  weekStart: Weekday;
  onTapDay: (date: DateStr, el: HTMLElement) => void;
}) {
  const { today } = timeline;
  const weeks = useMemo(
    () => calendarWeeks(timeline.firstDate, today, weekStart, 8),
    [timeline.firstDate, today, weekStart],
  );
  const monthLabels = useMemo(() => weekMonthLabels(weeks), [weeks]);
  const weekdays = orderedWeekdays(weekStart);

  return (
    <Card title="Calendar">
      <div className="flex gap-1">
        <div aria-hidden className="flex shrink-0 flex-col gap-1 pt-5">
          {weekdays.map((wd) => (
            <div
              key={wd}
              className="flex h-10 w-7 items-center text-[10px] text-neutral-500 dark:text-neutral-400"
            >
              {weekdayShort(addDays('2026-11-01', wd))}
            </div>
          ))}
        </div>
        <ScrollToEnd resetKey={weeks.length} label="Calendar, scroll for earlier weeks">
          <div className="flex w-max gap-1 pr-1 pb-1">
            {weeks.map((w, i) => (
              <div key={w} className="flex flex-col gap-1">
                <div
                  aria-hidden
                  className="h-4 w-10 overflow-visible text-[10px] whitespace-nowrap text-neutral-500 dark:text-neutral-400"
                >
                  {monthLabels[i]}
                </div>
                {weekdays.map((_, d) => {
                  const date = addDays(w, d);
                  const future = date > today;
                  const day = dayInfo(timeline, date);
                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={future}
                      onClick={(e) => onTapDay(date, e.currentTarget)}
                      aria-label={future ? undefined : describeDay(habit, day)}
                      aria-hidden={future || undefined}
                      tabIndex={future ? -1 : undefined}
                      className={`${CELL} ${future ? 'text-neutral-300 dark:text-neutral-700' : cellClass(day, date === today)} focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-500`}
                    >
                      {dayOfMonth(date)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollToEnd>
      </div>
      <ul
        aria-label="Legend"
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300"
      >
        <li className="flex items-center gap-1.5">
          <span className="habit-bg-strong h-3 w-3 rounded-sm" /> Done
        </li>
        <li className="flex items-center gap-1.5">
          <span className="habit-tint h-3 w-3 rounded-sm" /> Target met
        </li>
        <li className="flex items-center gap-1.5">
          <span className="cal-skip h-3 w-3 rounded-sm" /> Skipped
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-neutral-100 dark:bg-neutral-800" /> Not done
        </li>
      </ul>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Tap a day to change it.</p>
    </Card>
  );
}
