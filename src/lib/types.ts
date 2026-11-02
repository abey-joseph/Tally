/** Core domain types shared by the logic in `src/lib` and the UI. */

/** A calendar day as `YYYY-MM-DD` (always in the user's configured time zone). */
export type DateStr = string;

export type HabitType = 'boolean' | 'numeric';

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'timesPerWeek'; times: number } // 1–7
  | { kind: 'timesPerMonth'; times: number } // 1–31
  | { kind: 'everyNDays'; n: number }; // 2–30

export type TargetType = 'atLeast' | 'atMost';

export interface Habit {
  id: string;
  name: string;
  question?: string;
  description?: string;
  type: HabitType;
  frequency: Frequency;
  color: string;
  // numeric only:
  unit?: string;
  target?: number;
  targetType?: TargetType;
  // meta:
  order: number;
  archived: boolean;
  createdAt: string; // ISO timestamp
  startDate: DateStr; // score starts here
}

/**
 * boolean habits: 'y' = done, 'n' = explicitly not done, 's' = skipped.
 * numeric habits: a number (0 allowed, decimals allowed) or 's'.
 * A missing key means "not entered".
 */
export type EntryValue = 'y' | 'n' | 's' | number;

/** All entries for one habit, keyed by date (merged across the per-year Firestore docs). */
export type EntryMap = Record<DateStr, EntryValue>;
export type NoteMap = Record<DateStr, string>;

export type DayStatus = 'done' | 'autoDone' | 'skipped' | 'missed' | 'unknown';

/** 0 = Sunday … 6 = Saturday (same as `Date.prototype.getUTCDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ThemeSetting = 'system' | 'light' | 'dark';
export type SortBy = 'manual' | 'name' | 'score' | 'color';

export interface Settings {
  timezone: string;
  weekStart: Weekday;
  theme: ThemeSetting;
  /** Use pure black (#000) instead of near-black when the dark theme is active. */
  pureBlack: boolean;
  daysShown: number;
  newestFirst: boolean;
  sortBy: SortBy;
  confetti: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  timezone: 'Asia/Singapore',
  weekStart: 1,
  theme: 'system',
  pureBlack: false,
  daysShown: 5,
  newestFirst: true,
  sortBy: 'manual',
  confetti: true,
};
