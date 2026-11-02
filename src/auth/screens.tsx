import type { ReactNode } from 'react';
import { missingConfig } from '../firebase/config';
import { useAuth } from './AuthProvider';

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">{children}</div>
    </main>
  );
}

function Logo() {
  return (
    <img src="/favicon.svg" alt="" width={72} height={72} className="mx-auto mb-4 rounded-2xl" />
  );
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <Centered>
      <div role="status" aria-live="polite" className="text-neutral-500 dark:text-neutral-400">
        <div
          aria-hidden
          className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-600 dark:border-neutral-700"
        />
        {label}
      </div>
    </Centered>
  );
}

export function SignInScreen() {
  const { signIn, error } = useAuth();
  return (
    <Centered>
      <Logo />
      <h1 className="mb-2 text-2xl font-semibold">Tally</h1>
      <p className="mb-8 text-neutral-500 dark:text-neutral-400">Your habits, one tap a day.</p>
      <button
        type="button"
        onClick={() => void signIn()}
        className={`${buttonClass} border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700`}
      >
        <GoogleIcon />
        Sign in with Google
      </button>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </Centered>
  );
}

export function NoAccessScreen({ email }: { email: string | null }) {
  const { signOut } = useAuth();
  return (
    <Centered>
      <Logo />
      <h1 className="mb-2 text-2xl font-semibold">No access</h1>
      <p className="mb-8 text-neutral-500 dark:text-neutral-400">
        This is a private app.{' '}
        {email ? (
          <>
            The account <strong>{email}</strong> isn’t allowed.
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className={`${buttonClass} bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300`}
      >
        Sign out
      </button>
    </Centered>
  );
}

export function SetupNeededScreen() {
  return (
    <Centered>
      <Logo />
      <h1 className="mb-2 text-2xl font-semibold">Setup needed</h1>
      <p className="mb-4 text-neutral-500 dark:text-neutral-400">
        Firebase isn’t configured yet. Copy <code>.env.example</code> to <code>.env.local</code>,
        fill in these values and restart the dev server:
      </p>
      <ul className="mb-4 space-y-1 font-mono text-sm">
        {missingConfig.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        See <code>scripts/setup.md</code> for step-by-step instructions.
      </p>
    </Centered>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <Centered>
      <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
      <p role="alert" className="mb-8 text-neutral-500 dark:text-neutral-400">
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={`${buttonClass} bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900`}
      >
        Reload
      </button>
    </Centered>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
