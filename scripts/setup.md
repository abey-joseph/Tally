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

   | `.env.local` key                    | From `firebaseConfig`                         |
   | ----------------------------------- | --------------------------------------------- |
   | `VITE_FIREBASE_API_KEY`             | `apiKey`                                      |
   | `VITE_FIREBASE_AUTH_DOMAIN`         | `authDomain` (`<project-id>.firebaseapp.com`) |
   | `VITE_FIREBASE_PROJECT_ID`          | `projectId`                                   |
   | `VITE_FIREBASE_STORAGE_BUCKET`      | `storageBucket`                               |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId`                           |
   | `VITE_FIREBASE_APP_ID`              | `appId`                                       |

> **Sign-in domain on iPhone:** Safari blocks the cross-site storage Google sign-in needs
> when the sign-in page is on a different domain from the app. The deployed app therefore
> signs in through its own domain (`<project-id>.web.app`) automatically, whatever
> `.env.local` says. `.env.local`'s value (`firebaseapp.com`) is only used on localhost.

## 5. Allow the redirect URL for the web.app auth domain

The deployed app signs in through `<project-id>.web.app`, which needs one extra setting in Google Cloud:

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

`.firebaserc` already points at `tally-habits` (change it if you use a different project). Then:

```bash
npm run rules                        # generates firestore.rules
firebase deploy --only firestore:rules
```

## 8. Run it

```bash
npm run dev
```

Open <http://localhost:5173> and sign in with your allowed Google account.

## 9. Deploy the app

There are two ways to deploy. Both upload the app to Firebase Hosting **and** the database
rules, and both stay on the free plan.

### Option A: from your laptop

```bash
npm run deploy    # = rules + build + firebase deploy --only hosting,firestore:rules
```

### Option B: from your phone (GitHub Actions)

This route needs no laptop. The workflow (`.github/workflows/deploy.yml`) **only runs when you start
it by hand**, never on its own.

**One-time setup (about 10 minutes):**

1. **Create a deploy key in Google Cloud.**
   1. Open <https://console.cloud.google.com/iam-admin/serviceaccounts?project=tally-habits>.
   2. Tap **Create service account**. Name it `github-deploy`, then **Create and continue**.
   3. Role: **Firebase Admin**. Then **Continue → Done**.
   4. Open `github-deploy` → **Keys → Add key → Create new key → JSON → Create**. A `.json` file
      downloads (on iPhone it goes to the Files app, under Downloads).
2. **Copy the key's text.** Open the file in Files (it shows as text), then long-press →
   **Select All → Copy**.
3. **Add two GitHub secrets.**
   1. In Safari open
      `https://github.com/abey-joseph/Tally/settings/secrets/actions`. If the page is cramped, use
      **aA → Request Desktop Website**.
   2. Tap **New repository secret** and add these two:

   | Name                       | Value                                     |
   | -------------------------- | ----------------------------------------- |
   | `FIREBASE_SERVICE_ACCOUNT` | the JSON text you copied                  |
   | `ENV_LOCAL`                | the seven `VITE_…=` lines from step 4 + 6 |

   After this, delete the downloaded `.json` file from your phone. GitHub keeps the secret
   encrypted, and nobody can read it back, not even you.

**Each time you want to deploy:**

1. Open `https://github.com/abey-joseph/Tally/actions`, then **Deploy to Firebase → Run workflow**.
2. Pick the branch, type `deploy` in the box, then **Run workflow**.
3. Wait about 3 minutes for a green tick. If you get a red cross, open the run to see which step
   failed. It runs lint and tests first, so a broken build never goes live.

### After deploying

The app is at **https://tally-habits.web.app** (`https://<project-id>.web.app`).

1. On iPhone, open it in **Safari** (not Chrome; only Safari can install home-screen apps).
2. Sign in with your Google account.
3. Tap **Share → Add to Home Screen → Add**.

Open it from the home-screen icon from then on. It opens full-screen, works offline, and syncs
when you're back online. Open the same address on your laptop to use it there too.

**Updates:** deploy again, either way. The installed app picks up the new version the next
time it's opened, so close and reopen it if you want it right away.

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
