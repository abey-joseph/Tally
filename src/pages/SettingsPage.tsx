import { useAuth } from '../auth/AuthProvider';
import PageShell from '../components/PageShell';

// Temporary Stage 3 view: just sign-out. Full settings come in Stage 7.
export default function SettingsPage() {
  const { state, signOut } = useAuth();
  return (
    <PageShell title="Settings">
      {state.status === 'signedIn' && (
        <p className="py-4 text-neutral-500 dark:text-neutral-400">
          Signed in as {state.user.email}
        </p>
      )}
      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-11 rounded-full bg-neutral-900 px-6 text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        Sign out
      </button>
    </PageShell>
  );
}
