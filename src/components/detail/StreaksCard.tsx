import { shortDateWithYear } from '../../lib/format';
import type { StreakSummary } from '../../lib/streaks';
import { Card } from './common';

export default function StreaksCard({ streaks }: { streaks: StreakSummary }) {
  const max = Math.max(1, ...streaks.best.map((s) => s.length));
  const current = streaks.currentStreak;
  return (
    <Card title="Best streaks">
      <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
        Current streak: <strong>{streaks.current}</strong> {streaks.current === 1 ? 'day' : 'days'}
      </p>
      {streaks.best.length === 0 ? (
        <p className="text-sm text-neutral-500">No streaks yet — tick a day to start one.</p>
      ) : (
        <ol className="space-y-3">
          {streaks.best.map((s) => {
            const isCurrent = !!current && current.start === s.start;
            return (
              <li key={s.start}>
                <div className="mb-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{shortDateWithYear(s.start)}</span>
                  <span>{isCurrent ? 'now' : shortDateWithYear(s.end)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="habit-bg h-6 min-w-6 rounded-md"
                    style={{ width: `${(s.length / max) * 100}%`, opacity: isCurrent ? 1 : 0.75 }}
                  />
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {s.length} {s.length === 1 ? 'day' : 'days'}
                    {isCurrent && <span className="sr-only"> (current)</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
