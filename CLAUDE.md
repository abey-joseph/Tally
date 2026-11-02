# Habit Tracker v1 — Build Spec for Claude Code

> Working name: **Tally** (placeholder — change it anywhere before Stage 8).

## 0. How to work

- Build in the **8 stages** in section 10. **Stop after each stage**, run build/lint/tests, push to the branch, and report what was done and anything you decided.
- Ask before adding any dependency not listed here.
- Keep it simple. This is a **personal app for one user (me)**. No multi-user features.
- Explain decisions in plain English in your reports.

## 1. What we're building

A personal habit-tracking web app (installable PWA) inspired by the Android app _Loop Habit Tracker_. I'm on iPhone, so Loop isn't available to me. The goal is Loop's core experience in a web app that syncs between my phone and laptop.

Do **not** copy Loop's name, logo or source code. Re-implement the behaviour described in this spec. (Loop is GPLv3; we are writing our own code from this description.)

Core ideas from Loop to keep:

1. **Minimal, fast main screen**: list of habits with the last few days as tappable boxes.
2. **Habit strength score**: a percentage that rises with each completion and falls with misses, but a few misses after a long streak don't wipe out progress.
3. **Flexible schedules**: daily, X times per week, X times per month, every N days.
4. **Two habit types**: Yes/No and Measurable (a number with a unit and a target).
5. **Detailed stats per habit**: score chart, history bars, calendar heatmap, streaks, weekday frequency.
6. **Own my data**: export to CSV and JSON.

## 2. Tech stack (same as my FiveUp app)

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS
- React Router (tabs/routes)
- `vite-plugin-pwa` (installable, offline app shell)
- Firebase (free **Spark** plan only): Authentication (Google sign-in), Firestore (with offline persistence), Hosting
- Vitest for unit tests
- `date-fns` + `date-fns-tz` for dates
- **Charts: hand-built SVG components** (no chart library) to keep the bundle small. If that becomes painful, stop and ask.
- No Cloud Functions, no Cloud Storage, no secrets in the repo.

## 3. Time zone and dates

- All "days" are **Asia/Singapore** dates, regardless of device time zone. Store as a setting (`timezone`, default `Asia/Singapore`) so it can change later.
- Dates are stored as `YYYY-MM-DD` strings.
- Week starts on **Monday** (setting: `weekStart`, default Monday).
- No future days can be edited.

## 4. Data model (Firestore)

Single user. All data under `users/{uid}`.

```
users/{uid}                      -> { settings: {...}, createdAt }
users/{uid}/habits/{habitId}     -> Habit
users/{uid}/entries/{habitId_YYYY} -> { habitId, year, values: { "2026-11-02": EntryValue, ... } }
```

One entries document **per habit per year** keeps reads low (Spark limit: 50k reads/day).

```ts
type HabitType = 'boolean' | 'numeric';

type Frequency =
  | { kind: 'daily' }
  | { kind: 'timesPerWeek'; times: number } // 1–7
  | { kind: 'timesPerMonth'; times: number } // 1–31
  | { kind: 'everyNDays'; n: number }; // 2–30

interface Habit {
  id: string;
  name: string;
  question?: string; // e.g. "Did you exercise today?"
  description?: string;
  type: HabitType;
  frequency: Frequency;
  color: string; // from a fixed palette of ~20 colours
  // numeric only:
  unit?: string; // e.g. "km", "pages", "min"
  target?: number; // target per frequency period
  targetType?: 'atLeast' | 'atMost';
  // meta:
  order: number;
  archived: boolean;
  createdAt: string; // ISO
  startDate: string; // YYYY-MM-DD, score starts here
}

// boolean: 'y' = done, 'n' = explicitly not done, 's' = skipped
// numeric: number (0 allowed), or 's'
// Missing key = unknown / not entered.
type EntryValue = 'y' | 'n' | 's' | number;
// Optional note per day:
// values stored alongside in `notes: { "2026-11-02": "text" }`
```

Settings: `{ timezone, weekStart, theme: 'system'|'light'|'dark', daysShown: number (default 5), sortBy: 'manual'|'name'|'score'|'color', confetti: boolean }`.

## 5. Core logic (pure functions in `src/lib/`, fully unit-tested)

### 5.1 Day status

For each habit and day, compute a **status**:

- `done` — entered as done (boolean `'y'`, or numeric meets its share of target — see 5.3)
- `autoDone` — not entered, but the frequency target for the period is already met (shown as a lighter tick, like Loop)
- `skipped` — `'s'`
- `missed` — not done and the period target wasn't met
- `unknown` — no data and day is before habit `startDate` or in the future

**Frequency rule (rolling window)**: convert every frequency to "X times in N days":

- daily → 1 in 1
- timesPerWeek(x) → x in 7
- timesPerMonth(x) → x in 30
- everyNDays(n) → 1 in n

A day `d` is `autoDone` if it isn't manually done but the count of manual `done` days in the window `[d − N + 1, d]` is ≥ X.

### 5.2 Habit strength score (0–1, shown as %)

Exponential moving average computed day by day from `startDate` to today:

```
freq = X / N
m = 0.5 ^ (sqrt(freq) / 13)
score_today = score_yesterday * m + v_today * (1 − m)
```

- Start: `score = 0` on the day before `startDate`.
- `v = 1` for `done` or `autoDone`, `0` for `missed`.
- `skipped`: score stays the same (`score_today = score_yesterday`).
- Numeric habits: `v` = see 5.3.
- Unit tests must show: a long streak then 2–3 misses still leaves a high score; a daily habit done every day for ~90 days approaches ~95%+.

### 5.3 Numeric habits

- `atLeast`: rolling sum over the window `[d − N + 1, d]` divided by `target`, capped at 1 → `v`. Day counts as `done` when its own value > 0 and the window sum ≥ target.
- `atMost`: `v = 1` if the window sum ≤ target, else `0`. Day counts as `done` when entered and window sum ≤ target.
- Decimals allowed.

### 5.4 Streaks

A streak is consecutive days with status `done` or `autoDone`. `skipped` days don't break a streak (and don't add to its length). Return current streak and **top 5 best streaks** (start, end, length).

### 5.5 Stats

For one habit:

- Current score %, change vs 1 month ago, change vs 1 year ago
- Total completions
- History totals grouped by **week / month / quarter / year** (count of done days, or sum for numeric)
- Weekday frequency: completions per weekday per month (for the "frequency" dot grid)
- Calendar data: per-day status for heatmap

## 6. Screens

### 6.1 Main — Habit list (`/`)

- Top bar: app name, sort menu, "show archived" toggle, add button (+), settings.
- Column headers: last `daysShown` days (default 5), newest on the **right** on mobile (Loop puts newest first on the left — make this a setting `newestFirst`, default true like Loop).
- Each habit row:
  - Small **score ring** in the habit's colour (filled to score %)
  - Habit name (tap → detail screen)
  - One box per day:
    - Boolean: tap cycles **unknown/missed → done → skipped → missed**. Done = solid tick in habit colour; autoDone = faded tick; skipped = dash; missed = faint ✕.
    - Numeric: tap opens a small number pad sheet (value + optional note). Box shows the number; coloured if target met.
- Confetti burst (small, tasteful) when a habit is ticked for today, if enabled.
- Drag to reorder (when sort = manual).
- Empty state: "No habits yet — tap + to create your first one."

### 6.2 Create / edit habit (`/habit/new`, `/habit/:id/edit`)

- First choose type: **Yes or No** / **Measurable**.
- Fields: name, question, colour picker (palette), frequency picker (daily / X per week / X per month / every N days), notes/description.
- Numeric extras: unit, target, at least / at most.
- Start date (default today; can backdate for importing history).
- Edit screen also has: Archive / Unarchive, Delete (with confirm).

### 6.3 Habit detail (`/habit/:id`)

Sections, each a card:

1. **Overview**: score %, month change, year change, total.
2. **Score chart**: line chart of score over time; zoom buttons day / week / month / quarter / year.
3. **History**: bar chart of completions per week / month / quarter / year.
4. **Calendar**: GitHub-style heatmap, scrollable back through all history; **tap any past day to edit it** (same tap/number-pad behaviour as the main screen).
5. **Best streaks**: horizontal bars for top 5 streaks with dates.
6. **Frequency**: dot grid of weekday × month, dot size = number of completions.

Charts are SVG, use the habit colour, and work at 360px width.

### 6.4 Settings (`/settings`)

- Theme (system / light / dark)
- Week start, time zone, days shown, newest first, confetti on/off
- **Export**: CSV (one row per habit per day: date, habit, value, note) and full JSON backup
- **Import**: JSON backup (dry-run preview first, never overwrites existing entries without confirmation)
- Sign out

## 7. Auth and security

- Google sign-in only.
- Firestore rules: a user can read/write only `users/{their uid}/**`. Additionally lock the app to **one allowed email** (mine) via a rules check on `request.auth.token.email`. Any other account sees a "No access" screen.
- Write `scripts/setup.md` explaining the Firebase console steps (create project on Spark, enable Google sign-in, create Firestore in `asia-southeast1`, register web app, set allowed email, authorise the hosting domain).

## 8. Design

- Clean, minimal, Material-like (in Loop's spirit, not a copy): white/near-black background, cards, generous spacing, habit colours as the only strong colour.
- Full **dark mode** including a "pure black" option.
- Mobile-first (iPhone, 390px). Tap targets ≥ 44px. Laptop layout centres the list with max width ~720px.
- Accessible: labelled buttons, good contrast, status shown by icon + colour (not colour alone).

## 9. PWA

- Installable to the iPhone home screen, `display: standalone`, portrait.
- Original simple icon (e.g. a tick inside a ring) generated from an SVG in the repo.
- Service worker caches the app shell; Firestore offline persistence handles data so ticking works offline and syncs later.

## 10. Build order (stop and report after each)

1. **Scaffold**: Vite + React + TS + Tailwind + Router + PWA plugin, lint/format, `.gitignore`, `.env.example`, README skeleton. Builds cleanly.
2. **Core logic + tests**: types, dates, frequency/status (5.1), score (5.2), numeric (5.3), streaks (5.4), stats (5.5). Thorough Vitest tests; all pass.
3. **Firebase + auth**: init from env, Google sign-in, allowed-email check, No-access screen, `firestore.rules`, `firebase.json`, `.firebaserc` placeholder, data hooks with real-time listeners and optimistic updates.
4. **Main habit list** (6.1) with boolean and numeric entry.
5. **Create / edit habit** (6.2).
6. **Habit detail + charts** (6.3).
7. **Settings, export/import, dark mode, reorder, archive** (6.4).
8. **Polish + deploy prep**: loading/error/empty states, confetti, accessibility pass, icons, README. Run build + tests. **Do not deploy until I confirm**, then `firebase deploy --only hosting,firestore:rules`.

## 11. Acceptance criteria for v1

- [ ] I can create Yes/No and Measurable habits with all four frequency types.
- [ ] Ticking on the main screen is instant, works offline, and syncs to my other device.
- [ ] `X per week` habits show faded auto-ticks once the week target is met.
- [ ] Score behaves as in 5.2; unit tests cover streak-then-miss, skips, numeric at-least/at-most.
- [ ] Detail screen shows all 6 sections correctly and I can edit any past day from the calendar.
- [ ] Dates are always Singapore dates.
- [ ] Only my Google account can access data (UI and rules).
- [ ] CSV and JSON export work; JSON import round-trips without data loss.
- [ ] Installable on iPhone; production JS bundle ideally < 300 KB gzipped.

## 12. Out of scope for v1 (keep code easy to extend)

- **Reminders / push notifications** — iPhone web push needs a server to send them, which the free Spark plan can't do without Cloud Functions. Revisit later.
- **Home-screen widgets** — not possible for web apps on iPhone.
- Habit groups/categories, multiple users, sharing.
- Importing a Loop backup file (I don't have one).

## Repo notes (kept up to date by Claude)

- Commands: `npm run dev`, `npm run build`, `npm run lint`, `npm run format`, `npm test`.
- Path alias `@/` → `src/`.
- Dark mode is a class on `<html>` (`dark`, plus `black` for pure black); Tailwind uses `@custom-variant dark`.
- App icons: edit `assets/icon.svg` / `assets/icon-maskable.svg`, then run `scripts/generate-icons.mjs` (see header comment).
- Core logic lives in `src/lib/` (pure, no React/Firebase): `dates`, `frequency`, `status` (timeline, 5.1 + 5.3), `score` (5.2), `streaks` (5.4), `stats` (5.5, plus `analyzeHabit`).
- Dates are handled as `YYYY-MM-DD` strings / UTC day numbers; only `todayIn(timezone)` touches a real time zone.

- Firebase: `src/firebase/config.ts` (init from env, offline cache, emulators in dev only), `src/firebase/auth.ts` (popup, or redirect in the installed app).
- Data: `src/data/DataProvider.tsx` holds three live listeners (user doc, habits, entries) plus write actions (`useData()`). Writes are never awaited; Firestore's local cache makes them instant and they sync later. `src/data/model.ts` validates every document read.
- Auth gate: `src/auth/AuthGate.tsx` shows the loading, sign-in, No access or app screen. The data listeners only start for the allowed user.
- Rules: edit `firestore.rules.template`. `npm run rules` writes the git-ignored `firestore.rules` with the email from `.env.local`.
- Emulator testing: `VITE_USE_EMULATORS=true` (dev server only) exposes `window.__tallyEmulatorSignIn(email, verified?)` because Google's popup script can't load in sandboxes.

### Logic decisions (agreed interpretations of the spec)

- **Today, not yet entered** = status `missed` with `pending: true`. It does not lower the score or break the current streak until the day is over (the UI should show it as empty, not ✕).
- **Explicit "no" (`'n'`)** is never auto-ticked, even if the window target is met.
- **Numeric at-least**: a day with an entered `0` inside a met window is `autoDone` (not `done`), since its own value isn't > 0.
- **Numeric at-most**: an un-entered day counts as 0 → `autoDone` (faded tick) when the window total is within the limit.
- **Entries before `startDate`** are shown with their status but never scored; empty days before start are `unknown`.
- **Completions** (totals, weekday grid): Yes/No = days entered `'y'` (auto-ticks excluded); Measurable = days with value > 0. History bars for Measurable habits sum the values.
- `weekStart` is stored as a JS weekday number (0 = Sunday, 1 = Monday). Settings gained `pureBlack` and `newestFirst`.
