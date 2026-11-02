# Tally

A minimal, private habit tracker for one person. It's an installable web app (PWA) that works
offline and syncs between your phone and laptop.

Tally is inspired by how Loop Habit Tracker behaves, but it's an independent implementation: no Loop
code, name or assets.

## Features

- **Two kinds of habit**
  - **Yes or No** (did you do it?)
  - **Measurable** (a number with a unit, and a target of at least or at most)
- **Flexible schedules:** every day, X times per week, X times per month, or every N days. Days
  in between get a faded tick automatically once you've hit the target.
- **Fast main screen:** the last few days are tappable boxes, and ticking is instant (also offline).
  A small confetti burst plays when you complete today.
- **Habit strength score:** rises with each completion and falls gently with misses, so a couple of
  misses after a long streak don't wipe out your progress.
- **Detail screen** for each habit:
  - overview (score, change vs a month and a year ago, total);
  - score line chart;
  - history bars;
  - calendar with every day (tap any past day to edit it);
  - best streaks;
  - weekday frequency.
- **Your data:**
  - export a CSV spreadsheet or a full JSON backup;
  - import a backup with a preview first; existing data is never overwritten without asking.
- **Comfortable:** light, dark or pure-black theme. Configurable days shown, week start, time
  zone and sort order, plus drag-to-reorder and archiving.
- **Private:** Google sign-in, locked to one allowed email both in the app and in the database's
  security rules.
- **Dates:** all days are Singapore dates by default, whatever time zone the device is in.

## Tech

React 18 · Vite · TypeScript (strict) · Tailwind CSS 4 · React Router · vite-plugin-pwa ·
Firebase (Auth, Firestore with offline persistence, Hosting, free Spark plan) · Vitest ·
date-fns / date-fns-tz.

The charts are hand-built SVG (no chart library). The production JavaScript is about 285 KB
gzipped, most of it Firebase.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config + allowed email
npm run dev                  # http://localhost:5173
```

First-time Firebase setup (about 15 minutes, free) is in [`scripts/setup.md`](scripts/setup.md).

## Deploy

Full instructions are in [`scripts/setup.md` → Deploy the app](scripts/setup.md#9-deploy-the-app).

- **From a laptop:** `npm run deploy`. This generates the rules, builds, and runs
  `firebase deploy --only hosting,firestore:rules`.
- **From your phone:** GitHub → Actions → **Deploy to Firebase** → Run workflow (type `deploy`).
  This needs two repository secrets: `ENV_LOCAL` and `FIREBASE_SERVICE_ACCOUNT`.

Then open **https://tally-habits.web.app** in Safari on iPhone → **Share → Add to Home Screen**.

## Scripts

| Command                | What it does                                 |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the dev server                         |
| `npm run build`        | Type-check and build to `dist/`              |
| `npm run preview`      | Serve the production build                   |
| `npm run lint`         | ESLint                                       |
| `npm run format`       | Prettier (write)                             |
| `npm run format:check` | Prettier (check only)                        |
| `npm test`             | Unit tests (Vitest)                          |
| `npm run rules`        | Generate `firestore.rules` from `.env.local` |
| `npm run deploy`       | Rules + build + Firebase deploy              |

## Security

- Only the single email in `VITE_ALLOWED_EMAIL` can use the app.
  - **In the app:** anyone else sees a "No access" screen.
  - **In the database:** `firestore.rules` (generated from `firestore.rules.template`) refuses
    their reads and writes, and lets you touch only `users/{your uid}`.
- `.env.local` and the generated `firestore.rules` are git-ignored, so your email never goes into
  the repo. The Firebase web config isn't secret; it's designed to ship in the app.

## Project layout

```
src/
  lib/          pure logic + tests: dates, frequency, status, score, streaks, stats,
                charts, backup (CSV/JSON/import), habit form validation
  data/         Firestore listeners + writes (DataProvider), document validation
  firebase/     Firebase init and Google sign-in
  auth/         sign-in / No access / loading screens, auth gate
  components/   UI pieces (rows, day boxes, sheets, charts in components/detail)
  pages/        list, detail, create/edit, settings
scripts/        setup guide, rules + icon generators
assets/         source SVGs for the app icon
```

`CLAUDE.md` has the original spec and a list of design decisions.

## Not in v1

- Reminders and push notifications. They need a server, which the free plan doesn't include.
- Home-screen widgets (not possible for web apps on iPhone).
- Habit groups, multiple users and sharing.
