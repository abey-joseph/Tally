import {
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
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    if (POPUP_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebase().auth);
}
