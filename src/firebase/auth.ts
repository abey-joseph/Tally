import {
  browserPopupRedirectResolver,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth';
import { getFirebase } from './config';

/** Case-insensitive match against the single allowed email. Empty allow-list denies everyone. */
export function isAllowedEmail(email: string | null | undefined, allowed: string): boolean {
  const a = allowed.trim().toLowerCase();
  return !!a && !!email && email.trim().toLowerCase() === a;
}

/**
 * Marks that we left the page for a redirect sign-in, so the next start-up knows to wait for
 * its result instead of briefly showing the sign-in screen.
 */
const REDIRECT_FLAG = 'tally:redirectSignIn';

export function isRedirectPending(): boolean {
  try {
    return sessionStorage.getItem(REDIRECT_FLAG) === '1';
  } catch {
    return false;
  }
}

async function startRedirect(provider: GoogleAuthProvider): Promise<void> {
  try {
    sessionStorage.setItem(REDIRECT_FLAG, '1');
  } catch {
    // Storage unavailable: the redirect still works, the sign-in screen may just flash.
  }
  await signInWithRedirect(getFirebase().auth, provider, browserPopupRedirectResolver);
}

/**
 * Completes a redirect sign-in after returning to the app. Cheap when no redirect is pending:
 * Firebase checks its own session flag and skips loading Google's iframe.
 */
export async function completeRedirectSignIn(): Promise<void> {
  try {
    await getRedirectResult(getFirebase().auth, browserPopupRedirectResolver);
  } finally {
    try {
      sessionStorage.removeItem(REDIRECT_FLAG);
    } catch {
      // ignore
    }
  }
}

/** True when running as an installed home-screen app (where popups are unreliable on iOS). */
function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

/**
 * Google sign-in: popup in a normal browser tab, full-page redirect in the
 * installed iPhone app (or whenever the popup is blocked).
 */
export async function signInWithGoogle(): Promise<void> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (isStandalone()) {
    await startRedirect(provider);
    return;
  }
  try {
    await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    if (POPUP_FALLBACK_CODES.has(code)) {
      await startRedirect(provider);
      return;
    }
    throw err;
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebase().auth);
}
