import type { ReactNode } from 'react';
import WriteErrorToast from '../components/WriteErrorToast';
import { DataProvider, useData } from '../data/DataProvider';
import { useTheme } from '../theme';
import { useAuth } from './AuthProvider';
import { ErrorScreen, LoadingScreen, NoAccessScreen, SignInScreen } from './screens';

/** Shows sign-in / no-access screens, and only mounts the app (and its data) for the allowed user. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  switch (state.status) {
    case 'loading':
      return <LoadingScreen />;
    case 'signedOut':
      return <SignInScreen />;
    case 'denied':
      return <NoAccessScreen email={state.user.email} />;
    case 'signedIn':
      return (
        <DataProvider uid={state.user.uid}>
          <DataReady>{children}</DataReady>
        </DataProvider>
      );
  }
}

function DataReady({ children }: { children: ReactNode }) {
  const { loading, error, settings } = useData();
  useTheme(settings.theme, settings.pureBlack);
  if (error) return <ErrorScreen message={error} />;
  if (loading) return <LoadingScreen label="Loading your habits…" />;
  return (
    <>
      {children}
      <WriteErrorToast />
    </>
  );
}
