import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  completeRedirectSignIn,
  isAllowedEmail,
  isRedirectPending,
  signInWithGoogle,
  signOut,
} from '../firebase/auth';
import { ALLOWED_EMAIL, getFirebase } from '../firebase/config';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'denied'; user: User }
  | { status: 'signedIn'; user: User };

interface AuthContextValue {
  state: AuthState;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function describeAuthError(err: unknown): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'auth/network-request-failed':
      return "Couldn't reach Google. Check your connection and try again.";
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for sign-in. Add it in Firebase → Authentication → Settings → Authorised domains.';
    default:
      return code ? `Sign-in failed (${code}).` : 'Sign-in failed.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  /** `undefined` until Firebase has read the saved sign-in from this device. */
  const [user, setUser] = useState<User | null | undefined>(undefined);
  /** True while returning from a redirect sign-in (installed iPhone app). */
  const [redirecting, setRedirecting] = useState(isRedirectPending);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { auth } = getFirebase();
    // Finish a redirect sign-in, surfacing any error. A no-op when none is pending.
    completeRedirectSignIn()
      .catch((err: unknown) => setError(describeAuthError(err)))
      .finally(() => setRedirecting(false));
    return onAuthStateChanged(auth, setUser);
  }, []);

  const state = useMemo<AuthState>(() => {
    if (user === undefined || (redirecting && !user)) return { status: 'loading' };
    if (!user) return { status: 'signedOut' };
    if (user.emailVerified && isAllowedEmail(user.email, ALLOWED_EMAIL))
      return { status: 'signedIn', user };
    return { status: 'denied', user };
  }, [user, redirecting]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(describeAuthError(err));
    }
  }, []);

  const value = useMemo(() => ({ state, error, signIn, signOut }), [state, error, signIn]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
