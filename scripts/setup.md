# Firebase setup (one-time)

Everything here stays on the free **Spark** plan. You never need to add a billing account.
Allow about 15 minutes.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and click **Create a project**.
2. Name it, e.g. `tally-habits`. Firebase gives it a **project ID** such as `tally-habits` or `tally-habits-1a2b3`. Write the ID down.
3. Google Analytics: turn it **off**. The app doesn't need it.
4. Check that the plan shown at the bottom-left is **Spark (no-cost)**.

## 2. Turn on Google sign-in

1. **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable**. Pick your support email, then **Save**.
3. **Settings → Authorised domains**. `localhost`, `<project-id>.firebaseapp.com` and `<project-id>.web.app` should already be listed. Add any custom domain you use later.

## 3. Create the Firestore database

1. **Build → Firestore Database → Create database**.
2. **Edition:** Standard. **Location:** `asia-southeast1 (Singapore)`. You can't change the location later.
3. Start in **production mode**, which denies everything. Our real rules get deployed in step 7.

## 4. Register the web app

1. Click **Project overview (⚙) → Project settings → Your apps → Web (`</>`)**.
2. Nickname `Tally`. Tick **Also set up Firebase Hosting**, then **Register app**.
3. Firebase shows a `firebaseConfig` object. Copy its values into `.env.local` in the repo:

   ```bash
   cp .env.example .env.local
   ```

   | `.env.local` key                    | From `firebaseConfig`                           |
   | ----------------------------------- | ----------------------------------------------- |
   | `VITE_FIREBASE_API_KEY`             | `apiKey`                                        |
   | `VITE_FIREBASE_AUTH_DOMAIN`         | **`<project-id>.web.app`** (see the note below) |
   | `VITE_FIREBASE_PROJECT_ID`          | `projectId`                                     |
   | `VITE_FIREBASE_STORAGE_BUCKET`      | `storageBucket`                                 |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId`                             |
   | `VITE_FIREBASE_APP_ID`              | `appId`                                         |

> **Why `web.app` for the auth domain?** Safari on iPhone blocks the cross-site storage that
> Google sign-in needs when the sign-in page is on a different domain from the app. If you
> set the auth domain to the same domain the app is hosted on, sign-in also works from the
> home-screen app. For local development, `<project-id>.firebaseapp.com` is fine too.

## 5. Allow the redirect URL for the web.app auth domain

The `web.app` auth domain needs one extra setting in Google Cloud:

1. Open <https://console.cloud.google.com/apis/credentials> with the same project selected.
2. Under **OAuth 2.0 Client IDs**, open **Web client (auto created by Google Service)**.
3. Under **Authorised redirect URIs**, add `https://<project-id>.web.app/__/auth/handler`, then **Save**. It can take a few minutes to take effect.

## 6. Set the allowed email

In `.env.local`:

```bash
VITE_ALLOWED_EMAIL=you@gmail.com
```

This one value is used in two places:

- **In the app:** any other Google account sees the **No access** screen.
- **In the database rules:** `npm run rules` writes it into `firestore.rules`, which is generated from `firestore.rules.template`. Firestore then refuses every other account, even if someone bypasses the app. `firestore.rules` is git-ignored, so your email never ends up in the repo.

## 7. Link the CLI and deploy the rules

```bash
npm install -g firebase-tools        # once
firebase login
```

Replace `your-firebase-project-id` in `.firebaserc` with your project ID. Then:

```bash
npm run rules                        # generates firestore.rules
firebase deploy --only firestore:rules
```

## 8. Run it

```bash
npm run dev
```

Open <http://localhost:5173> and sign in with your allowed Google account.

## 9. Deploy the app (Stage 8)

```bash
npm run deploy    # = rules + build + firebase deploy --only hosting,firestore:rules
```

The app is then at `https://<project-id>.web.app`. On iPhone, open it in Safari and tap
**Share → Add to Home Screen**.

---

## Optional: local emulators (no real project needed)

Requires Java 11+.

```bash
VITE_ALLOWED_EMAIL=you@gmail.com npm run rules
npx firebase-tools emulators:start --only auth,firestore --project demo-tally
```

In `.env.local`, set `VITE_USE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-tally`. Any
non-empty values work for the other keys.

## Spark plan limits (plenty for one person)

- Firestore: 50k reads, 20k writes and 1 GiB storage per day/total. Tally keeps one entries document per habit per year, so opening the app costs only a few dozen reads.
- Hosting: 10 GB storage, 360 MB/day transfer.
- Authentication: free for Google sign-in.
