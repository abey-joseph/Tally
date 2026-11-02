import { formatChange } from '../../lib/charts';
import { formatCompact, formatNumber } from '../../lib/format';
import type { Overview } from '../../lib/stats';
import type { Habit } from '../../lib/types';
import ScoreRing from '../ScoreRing';

export default function OverviewCard({ habit, overview }: { habit: Habit; overview: Overview }) {
  const pct = Math.round(overview.score * 100);
  const numeric = habit.type === 'numeric';
  const total = numeric
    ? formatCompact(overview.totalValue)
    : formatCompact(overview.totalCompletions);
  const totalLabel = numeric && habit.unit ? `Total ${habit.unit}` : 'Total';
  const totalSr = numeric
    ? `Total: ${formatNumber(overview.totalValue)}${habit.unit ? ` ${habit.unit}` : ''}.`
    : `Total: done ${formatNumber(overview.totalCompletions)} times.`;
  const stat = (label: string, value: string, sr?: string) => (
    <div className="min-w-0">
      <div className="truncate text-lg font-semibold tabular-nums" aria-hidden={!!sr}>
        {value}
      </div>
      {sr && <span className="sr-only">{sr}</span>}
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
  return (
    <section aria-label="Overview" className="card flex items-center gap-4 p-4">
      <div className="habit-fg relative shrink-0">
        <ScoreRing score={overview.score} size={72} strokeWidth={8} decorative />
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-neutral-900 tabular-nums dark:text-neutral-100">
          {pct}%
        </span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2">
        <span className="sr-only">Score {pct}%.</span>
        {stat(
          'Month',
          formatChange(overview.monthChange),
          `Change over the last month: ${formatChange(overview.monthChange)}.`,
        )}
        {stat(
          'Year',
          formatChange(overview.yearChange),
          `Change over the last year: ${formatChange(overview.yearChange)}.`,
        )}
        {stat(totalLabel, total, totalSr)}
      </div>
    </section>
  );
}
