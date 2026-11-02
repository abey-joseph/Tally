import PageShell from '../components/PageShell';

export default function NotFoundPage() {
  return (
    <PageShell title="Not found">
      <p className="py-8 text-center text-neutral-500 dark:text-neutral-400">
        This page doesn't exist.
      </p>
    </PageShell>
  );
}
