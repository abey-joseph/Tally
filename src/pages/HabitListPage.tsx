import PageShell from '../components/PageShell';
import { useData } from '../data/DataProvider';

// Temporary Stage 3 view: proves live data is flowing. Replaced by the real list in Stage 4.
export default function HabitListPage() {
  const { habits, today, hasPendingWrites, online } = useData();
  const active = habits.filter((h) => !h.archived);
  return (
    <PageShell title="Tally">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Today: {today} · {online ? 'Online' : 'Offline'}
        {hasPendingWrites ? ' · Syncing…' : ''}
      </p>
      {active.length === 0 ? (
        <p className="py-8 text-center text-neutral-500 dark:text-neutral-400">
          No habits yet — tap + to create your first one.
        </p>
      ) : (
        <ul className="py-4">
          {active.map((h) => (
            <li key={h.id} className="py-2">
              {h.name}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
