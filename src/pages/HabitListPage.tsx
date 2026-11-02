import PageShell from '../components/PageShell';

export default function HabitListPage() {
  return (
    <PageShell title="Tally">
      <p className="py-8 text-center text-neutral-500 dark:text-neutral-400">
        No habits yet — tap + to create your first one.
      </p>
    </PageShell>
  );
}
