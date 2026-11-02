# Tally

A minimal, personal habit tracker — an installable web app (PWA) that syncs between phone and laptop via Firebase.

Inspired by the behaviour of Loop Habit Tracker; this is an independent implementation (no Loop code, name or assets).

> **Status:** in development. See `CLAUDE.md` for the full spec and build stages.

## Features (v1 goals)

- Yes/No and Measurable habits
- Flexible schedules: daily, X per week, X per month, every N days
- Habit strength score, streaks, history and calendar charts
- Works offline; syncs across devices
- CSV / JSON export, JSON import

## Tech

React 18 · Vite · TypeScript (strict) · Tailwind CSS · React Router · vite-plugin-pwa · Firebase (Auth, Firestore, Hosting — Spark plan) · Vitest · date-fns

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Firebase web config (Stage 3)
npm run dev
```

## Scripts

| Command                | What it does                    |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Start the dev server            |
| `npm run build`        | Type-check and build to `dist/` |
| `npm run preview`      | Serve the production build      |
| `npm run lint`         | ESLint                          |
| `npm run format`       | Prettier (write)                |
| `npm run format:check` | Prettier (check only)           |
| `npm test`             | Run unit tests once (Vitest)    |
| `npm run rules`        | Generate `firestore.rules`      |
| `npm run deploy`       | Rules + build + Firebase deploy |

## Firebase setup

Follow [`scripts/setup.md`](scripts/setup.md) (about 15 minutes, free Spark plan). In short:
create the project, enable Google sign-in, create Firestore in `asia-southeast1`, copy the web
config and your allowed email into `.env.local`, then `npm run rules` and
`firebase deploy --only firestore:rules`.

Security: only the single email in `VITE_ALLOWED_EMAIL` can use the app. The UI shows anyone
else a "No access" screen, and the Firestore rules (generated from `firestore.rules.template`)
refuse their reads and writes.

## Deploy

_Coming in Stage 8._
