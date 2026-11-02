import { useMemo } from 'react';
import { orderedWeekdays } from '../../lib/charts';
import { addDays } from '../../lib/dates';
import { monthShort, weekdayShort } from '../../lib/format';
import { weekdayFrequency } from '../../lib/stats';
import type { Timeline } from '../../lib/status';
import type { Habit, Weekday } from '../../lib/types';
import { AXIS_TEXT } from './chartUtils';
import { Card, ScrollToEnd } from './common';

const COL = 34;
const ROW = 28;
const TOP = 6;
const MAX_R = 11;

export default function FrequencyCard({
  habit,
  timeline,
  weekStart,
}: {
  habit: Habit;
  timeline: Timeline;
  weekStart: Weekday;
}) {
  const rows = useMemo(() => weekdayFrequency(habit, timeline), [habit, timeline]);
  const weekdays = orderedWeekdays(weekStart);
  const max = Math.max(1, ...rows.flatMap((r) => r.counts));
  const height = TOP + 7 * ROW + 22;
  const width = Math.max(rows.length * COL, COL * 6);
  const x = (i: number) => width - COL / 2 - (rows.length - 1 - i) * COL;

  return (
    <Card title="Frequency">
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        Completions by weekday, per month. Bigger dot = more often.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No data yet.</p>
      ) : (
        <div className="flex">
          <svg width={30} height={height} aria-hidden className="shrink-0">
            {weekdays.map((wd, r) => (
              <text key={wd} x={0} y={TOP + r * ROW + ROW / 2 + 3} className={AXIS_TEXT}>
                {weekdayShort(addDays('2026-11-01', wd))}
              </text>
            ))}
          </svg>
          <ScrollToEnd resetKey={rows.length} label="Weekday frequency, scroll for earlier months">
            <svg
              width={width}
              height={height}
              className="habit-fg block"
              role="img"
              aria-label={summary(rows, weekdays)}
            >
              {rows.map((row, i) => (
                <g key={row.month}>
                  {weekdays.map((wd, r) => {
                    const c = row.counts[wd];
                    const cy = TOP + r * ROW + ROW / 2;
                    return c > 0 ? (
                      <circle
                        key={wd}
                        cx={x(i)}
                        cy={cy}
                        r={3 + (MAX_R - 3) * Math.sqrt(c / max)}
                        fill="currentColor"
                      />
                    ) : (
                      <circle
                        key={wd}
                        cx={x(i)}
                        cy={cy}
                        r={2}
                        className="fill-neutral-200 dark:fill-neutral-700"
                      />
                    );
                  })}
                  <text x={x(i)} y={height - 6} textAnchor="middle" className={AXIS_TEXT}>
                    {row.month.endsWith('-01')
                      ? `${monthShort(`${row.month}-01`)} ’${row.month.slice(2, 4)}`
                      : monthShort(`${row.month}-01`)}
                  </text>
                </g>
              ))}
            </svg>
          </ScrollToEnd>
        </div>
      )}
    </Card>
  );
}

function summary(rows: { counts: number[] }[], weekdays: Weekday[]): string {
  const totals = weekdays.map((wd) => rows.reduce((s, r) => s + (r.counts[wd] ?? 0), 0));
  const best = Math.max(...totals);
  if (best === 0) return 'No completions yet.';
  const top = weekdays
    .filter((_, i) => totals[i] === best)
    .map((wd) => weekdayShort(addDays('2026-11-01', wd)));
  return `Most completions on ${top.join(', ')} (${best}).`;
}
