import { useMemo, useState } from 'react';
import { axisLabel, PITCH, scoreSeries, type ScoreZoom } from '../../lib/charts';
import type { ScorePoint } from '../../lib/score';
import type { Weekday } from '../../lib/types';
import { AXIS_TEXT, GRID_LINE, useElementWidth } from './chartUtils';
import { Card, ScrollToEnd, Segmented } from './common';

const H = 180;
const TOP = 10;
const BOTTOM = 24;
const PLOT = H - TOP - BOTTOM;
const LEVELS = [0, 0.25, 0.5, 0.75, 1];
const y = (v: number) => TOP + (1 - v) * PLOT;

const ZOOMS: { value: ScoreZoom; label: string }[] = [
  { value: 'day', label: 'D' },
  { value: 'week', label: 'W' },
  { value: 'month', label: 'M' },
  { value: 'quarter', label: 'Q' },
  { value: 'year', label: 'Y' },
];

export default function ScoreChart({
  scores,
  weekStart,
}: {
  scores: ScorePoint[];
  weekStart: Weekday;
}) {
  const [zoom, setZoom] = useState<ScoreZoom>('week');
  const [wrapRef, wrapWidth] = useElementWidth<HTMLDivElement>();
  const points = useMemo(() => scoreSeries(scores, zoom, weekStart), [scores, zoom, weekStart]);

  const pitch = PITCH[zoom];
  const n = points.length;
  const width = Math.max(wrapWidth - 34, n * pitch + 24);
  const x = (i: number) => width - 16 - (n - 1 - i) * pitch;
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join('');
  const area = n ? `${line}L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z` : '';
  const latest = points[n - 1];

  return (
    <Card
      title="Score"
      actions={
        <Segmented label="Score chart zoom" value={zoom} options={ZOOMS} onChange={setZoom} />
      }
    >
      <div ref={wrapRef} className="flex">
        <svg width={34} height={H} aria-hidden className="shrink-0">
          {LEVELS.map((v) => (
            <text key={v} x={30} y={y(v) + 3} textAnchor="end" className={AXIS_TEXT}>
              {v * 100}%
            </text>
          ))}
        </svg>
        {n === 0 ? (
          <p className="self-center text-sm text-neutral-500">No data yet.</p>
        ) : (
          <ScrollToEnd resetKey={zoom} label="Score history, scroll for earlier">
            <svg
              width={width}
              height={H}
              role="img"
              aria-label={`Score over time by ${zoom}. Latest ${Math.round((latest?.value ?? 0) * 100)}%.`}
              className="habit-fg block"
            >
              {LEVELS.map((v) => (
                <line key={v} x1={0} x2={width} y1={y(v)} y2={y(v)} className={GRID_LINE} />
              ))}
              <path d={area} fill="currentColor" fillOpacity={0.12} />
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {zoom !== 'day' &&
                points.map((p, i) => (
                  <circle key={p.start} cx={x(i)} cy={y(p.value)} r={2.5} fill="currentColor" />
                ))}
              {latest && <circle cx={x(n - 1)} cy={y(latest.value)} r={4.5} fill="currentColor" />}
              {points.map((p, i) => {
                const label = axisLabel(p.start, zoom, i, weekStart);
                return label ? (
                  <text key={p.start} x={x(i)} y={H - 6} textAnchor="middle" className={AXIS_TEXT}>
                    {label}
                  </text>
                ) : null;
              })}
            </svg>
          </ScrollToEnd>
        )}
      </div>
    </Card>
  );
}
