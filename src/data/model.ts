/**
 * Pure helpers between Firestore documents and the app's types.
 * Everything read from Firestore is validated here, so a bad or old document
 * can't crash the UI. No Firebase imports — fully unit-testable.
 */
import { isValidDateStr, isValidTimezone, yearOf } from '../lib/dates';
import {
  DEFAULT_SETTINGS,
  type DateStr,
  type EntryMap,
  type EntryValue,
  type Frequency,
  type Habit,
  type NoteMap,
  type Settings,
  type Weekday,
} from '../lib/types';

/** Shape of `users/{uid}/entries/{habitId_YYYY}`. */
export interface EntryDoc {
  habitId: string;
  year: number;
  values?: Record<string, unknown>;
  notes?: Record<string, unknown>;
}

export interface HabitEntries {
  values: EntryMap;
  notes: NoteMap;
}

export const emptyHabitEntries = (): HabitEntries => ({ values: {}, notes: {} });

/** One entries document per habit per year. */
export function entryDocId(habitId: string, date: DateStr): string {
  return `${habitId}_${yearOf(date)}`;
}

export function isEntryValue(v: unknown): v is EntryValue {
  return v === 'y' || v === 'n' || v === 's' || (typeof v === 'number' && Number.isFinite(v));
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Merges all per-year entry docs into one map per habit, dropping invalid keys/values. */
export function mergeEntryDocs(docs: Iterable<unknown>): Map<string, HabitEntries> {
  const out = new Map<string, HabitEntries>();
  for (const doc of docs) {
    if (!isRecord(doc) || typeof doc.habitId !== 'string' || !doc.habitId) continue;
    let he = out.get(doc.habitId);
    if (!he) out.set(doc.habitId, (he = emptyHabitEntries()));
    if (isRecord(doc.values)) {
      for (const [date, v] of Object.entries(doc.values)) {
        if (isValidDateStr(date) && isEntryValue(v)) he.values[date] = v;
      }
    }
    if (isRecord(doc.notes)) {
      for (const [date, n] of Object.entries(doc.notes)) {
        if (isValidDateStr(date) && typeof n === 'string' && n.trim()) he.notes[date] = n;
      }
    }
  }
  return out;
}

const intIn = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;

export function parseFrequency(v: unknown): Frequency | null {
  if (!isRecord(v)) return null;
  switch (v.kind) {
    case 'daily':
      return { kind: 'daily' };
    case 'timesPerWeek': {
      const times = intIn(v.times, 1, 7);
      return times === null ? null : { kind: 'timesPerWeek', times };
    }
    case 'timesPerMonth': {
      const times = intIn(v.times, 1, 31);
      return times === null ? null : { kind: 'timesPerMonth', times };
    }
    case 'everyNDays': {
      const n = intIn(v.n, 2, 30);
      return n === null ? null : { kind: 'everyNDays', n };
    }
    default:
      return null;
  }
}

const optString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v : undefined;

/** Validates a habit document. Returns null if it is unusable. */
export function parseHabit(id: string, data: unknown): Habit | null {
  if (!isRecord(data)) return null;
  const name = optString(data.name);
  const type = data.type === 'boolean' || data.type === 'numeric' ? data.type : null;
  const frequency = parseFrequency(data.frequency);
  const startDate =
    typeof data.startDate === 'string' && isValidDateStr(data.startDate) ? data.startDate : null;
  if (!name || !type || !frequency || !startDate) return null;

  const habit: Habit = {
    id,
    name,
    type,
    frequency,
    startDate,
    color: optString(data.color) ?? '#607d8b',
    order: typeof data.order === 'number' && Number.isFinite(data.order) ? data.order : 0,
    archived: data.archived === true,
    createdAt: optString(data.createdAt) ?? new Date(0).toISOString(),
  };
  const question = optString(data.question);
  const description = optString(data.description);
  if (question) habit.question = question;
  if (description) habit.description = description;
  if (type === 'numeric') {
    const unit = optString(data.unit);
    if (unit) habit.unit = unit;
    habit.target =
      typeof data.target === 'number' && Number.isFinite(data.target) && data.target >= 0
        ? data.target
        : 0;
    habit.targetType = data.targetType === 'atMost' ? 'atMost' : 'atLeast';
  }
  return habit;
}

/** Habit → Firestore document (no `id`; undefined fields omitted). */
export function habitToDoc(habit: Habit): Record<string, unknown> {
  const { id: _id, ...rest } = habit;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

/** Reads `settings` from the user document, falling back to defaults field by field. */
export function parseSettings(data: unknown): Settings {
  const s = isRecord(data) ? data : {};
  const d = DEFAULT_SETTINGS;
  return {
    timezone:
      typeof s.timezone === 'string' && isValidTimezone(s.timezone) ? s.timezone : d.timezone,
    weekStart: (intIn(s.weekStart, 0, 6) ?? d.weekStart) as Weekday,
    theme: s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : d.theme,
    pureBlack: typeof s.pureBlack === 'boolean' ? s.pureBlack : d.pureBlack,
    daysShown: intIn(s.daysShown, 1, 14) ?? d.daysShown,
    newestFirst: typeof s.newestFirst === 'boolean' ? s.newestFirst : d.newestFirst,
    sortBy:
      s.sortBy === 'manual' || s.sortBy === 'name' || s.sortBy === 'score' || s.sortBy === 'color'
        ? s.sortBy
        : d.sortBy,
    confetti: typeof s.confetti === 'boolean' ? s.confetti : d.confetti,
  };
}

/** Sorts habits by their manual `order`, then name, for stable display. */
export function byOrder(a: Habit, b: Habit): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}
