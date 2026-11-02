import { useMemo, useState } from 'react';
import { axisLabel, PITCH } from '../../lib/charts';
import type { Period } from '../../lib/dates';
import { formatCompact } from '../../lib/format';
import { historyTotals } from '../../lib/stats';
import type { Timeline } from '../../lib/status';
import type { Habit, Weekday } from '../../lib/types';
import { AXIS_TEXT, GRID_LINE, useElementWidth } from './chartUtils';
import { Card, ScrollToEnd, Segmented } from './common';

const H = 160;
const TOP = 18;
const BOTTOM = 24;
const PLOT = H - TOP - BOTTOM;

const ZOOMS: { value: Period; label: string }[] = [
  { value: 'week', label: 'W' },
  { value: 'month', label: 'M' },
  { value: 'quarter', label: 'Q' },
  { value: 'year', label: 'Y' },
];

export default function HistoryChart({
  habit,
  timeline,
  weekStart,
}: {
  habit: Habit;
  timeline: Timeline;
  weekStart: Weekday;
}) {
  const [zoom, setZoom] = useState<Period>('week');
  const [wrapRef, wrapWidth] = useElementWidth<HTMLDivElement>();
  const totals = useMemo(
    () => historyTotals(habit, timeline, zoom, weekStart),
    [habit, timeline, zoom, weekStart],
  );
  const pitch = Math.max(PITCH[zoom], 30);
  const barW = Math.round(pitch * 0.62);
  const n = totals.length;
  const width = Math.max(wrapWidth, n * pitch + 8);
  const x = (i: number) => width - pitch / 2 - 4 - (n - 1 - i) * pitch;
  const max = Math.max(1, ...totals.map((t) => t.total));
  const unit = habit.type === 'numeric' ? (habit.unit ?? '') : 'times';

  return (
    <Card
      title="History"
      actions={<Segmented label="History zoom" value={zoom} options={ZOOMS} onChange={setZoom} />}
    >
      <div ref={wrapRef}>
        {n === 0 ? (
          <p className="text-sm text-neutral-500">No data yet.</p>
        ) : (
          <ScrollToEnd resetKey={zoom} label="History bars, scroll for earlier">
            <svg
              width={width}
              height={H}
              role="img"
              aria-label={`Totals per ${zoom}. This ${zoom}: ${formatCompact(totals[n - 1]!.total)} ${unit}.`}
              className="habit-fg block"
            >
              <line x1={0} x2={width} y1={TOP + PLOT} y2={TOP + PLOT} className={GRID_LINE} />
              {totals.map((t, i) => {
                const h = (t.total / max) * PLOT;
                const label = axisLabel(t.start, zoom, i, weekStart);
                return (
                  <g key={t.start}>
                    {t.total > 0 && (
                      <>
                        <rect
                          x={x(i) - barW / 2}
                          y={TOP + PLOT - h}
                          width={barW}
                          height={h}
                          rx={3}
                          fill="currentColor"
                        />
                        <text
                          x={x(i)}
                          y={TOP + PLOT - h - 4}
                          textAnchor="middle"
                          className={`${AXIS_TEXT} font-semibold`}
                        >
                          {formatCompact(t.total)}
                        </text>
                      </>
                    )}
                    {label && (
                      <text x={x(i)} y={H - 6} textAnchor="middle" className={AXIS_TEXT}>
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </ScrollToEnd>
        )}
      </div>
    </Card>
  );
}
