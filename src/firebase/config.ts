/**
 * Firebase initialisation from Vite env vars (see `.env.example`).
 * Nothing here is secret: Firebase web config ships in the client bundle by design.
 * Access control is enforced by Firestore security rules + the allowed-email check.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const env = import.meta.env;

/**
 * When served from Firebase Hosting (*.web.app / *.firebaseapp.com), sign in through the
 * app's own domain: Safari on iPhone blocks the cross-site storage that a different auth
 * domain would need. Elsewhere (localhost) use the configured auth domain.
 */
const host = typeof window === 'undefined' ? '' : window.location.hostname;
const authDomain = /\.(web\.app|firebaseapp\.com)$/.test(host)
  ? host
  : env.VITE_FIREBASE_AUTH_DOMAIN;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** The only Google account allowed in (must match `firestore.rules`). */
export const ALLOWED_EMAIL: string = (env.VITE_ALLOWED_EMAIL ?? '').trim();

// Dev server only: never possible in a production build.
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';

/** Names of required env vars that are missing, so the UI can explain what to set. */
export const missingConfig: string[] = [
  ['VITE_FIREBASE_API_KEY', config.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', config.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', config.projectId],
  ['VITE_FIREBASE_APP_ID', config.appId],
  ['VITE_ALLOWED_EMAIL', ALLOWED_EMAIL],
]
  .filter(([, v]) => !v)
  .map(([k]) => k as string);

export const isFirebaseConfigured = missingConfig.length === 0;

interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let handles: FirebaseHandles | null = null;

/** Lazily initialises Firebase once. Throws if the env config is incomplete. */
export function getFirebase(): FirebaseHandles {
  if (handles) return handles;
  if (!isFirebaseConfigured) {
    throw new Error(`Firebase is not configured. Missing: ${missingConfig.join(', ')}`);
  }
  const app = initializeApp(config);
  const auth = getAuth(app);
  // Offline persistence (IndexedDB), shared safely across multiple open tabs.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // Emulator-only hook for automated tests: sign in with a fake Google account.
    // `useEmulators` is a build-time constant, so this is stripped from production builds.
    (window as unknown as Record<string, unknown>).__tallyEmulatorSignIn = (
      email: string,
      emailVerified = true,
    ) =>
      signInWithCredential(
        auth,
        GoogleAuthProvider.credential(
          JSON.stringify({ sub: email, email, email_verified: emailVerified }),
        ),
      );
  }
  handles = { app, auth, db };
  return handles;
}
