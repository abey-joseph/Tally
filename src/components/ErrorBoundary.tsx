import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defence: a friendly screen with Reload instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] crashed', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
          <p className="mb-2 text-neutral-500 dark:text-neutral-400">
            Your data is safe — it’s stored in the cloud and on this device. Reloading usually fixes
            this.
          </p>
          <p className="mb-8 font-mono text-xs break-words text-neutral-400">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="min-h-11 rounded-full bg-neutral-900 px-6 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}
