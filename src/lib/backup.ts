/**
 * Export (CSV + JSON backup) and import (validate → dry-run plan → writes).
 * Pure functions: no Firebase, no DOM.
 */
import { mergeEntryDocs, parseHabit, parseSettings, type HabitEntries } from '../data/model';
import { yearOf } from './dates';
import type { DateStr, EntryValue, Habit, Settings } from './types';

export const BACKUP_VERSION = 1;

export interface Backup {
  app: 'tally';
  version: number;
  exportedAt: string;
  settings: Settings;
  habits: Habit[];
  /** Keyed by habit id. */
  entries: Record<string, HabitEntries>;
}

type EntriesFor = (habitId: string) => HabitEntries;

export function buildBackup(
  settings: Settings,
  habits: Habit[],
  entriesFor: EntriesFor,
  exportedAt: string,
): Backup {
  const entries: Record<string, HabitEntries> = {};
  for (const h of habits) {
    const e = entriesFor(h.id);
    // Dates in order, so the same data always produces the same file.
    entries[h.id] = { values: sortKeys(e.values), notes: sortKeys(e.notes) };
  }
  return { app: 'tally', version: BACKUP_VERSION, exportedAt, settings, habits, entries };
}

function sortKeys<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/* ---------- CSV ---------- */

function csvCell(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function entryValueText(v: EntryValue | undefined): string {
  if (v === undefined) return '';
  if (v === 'y') return 'yes';
  if (v === 'n') return 'no';
  if (v === 's') return 'skipped';
  return String(v);
}

/** One row per habit per day that has a value or a note: date, habit, value, note. */
export function toCsv(habits: Habit[], entriesFor: EntriesFor): string {
  const rows: { date: DateStr; rank: number; cells: string[] }[] = [];
  habits.forEach((h, rank) => {
    const { values, notes } = entriesFor(h.id);
    const dates = new Set([...Object.keys(values), ...Object.keys(notes)]);
    for (const date of dates) {
      rows.push({
        date,
        rank,
        cells: [date, h.name, entryValueText(values[date]), notes[date] ?? ''],
      });
    }
  });
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.rank - b.rank));
  const lines = [['date', 'habit', 'value', 'note'], ...rows.map((r) => r.cells)];
  // BOM so Excel opens UTF-8 (e.g. emoji, accents) correctly.
  return '﻿' + lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/* ---------- Parse / validate a backup file ---------- */

export type ParseResult =
  { ok: true; backup: Backup; skippedHabits: number } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON.' };
  }
  if (!isRecord(data) || data.app !== 'tally') {
    return { ok: false, error: 'This doesn’t look like a Tally backup.' };
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Tally.' };
  }
  if (!Array.isArray(data.habits)) return { ok: false, error: 'The backup has no habits list.' };

  const habits: Habit[] = [];
  let skippedHabits = 0;
  const seen = new Set<string>();
  for (const raw of data.habits) {
    const id = isRecord(raw) && typeof raw.id === 'string' ? raw.id : '';
    const h = id && !seen.has(id) && /^[\w-]{1,128}$/.test(id) ? parseHabit(id, raw) : null;
    if (h) {
      habits.push(h);
      seen.add(id);
    } else skippedHabits++;
  }

  const rawEntries = isRecord(data.entries) ? data.entries : {};
  const merged = mergeEntryDocs(
    Object.entries(rawEntries)
      .filter(([id]) => seen.has(id))
      .map(([habitId, e]) => (isRecord(e) ? { habitId, values: e.values, notes: e.notes } : null)),
  );
  const entries: Record<string, HabitEntries> = {};
  for (const h of habits) entries[h.id] = merged.get(h.id) ?? { values: {}, notes: {} };

  return {
    ok: true,
    skippedHabits,
    backup: {
      app: 'tally',
      version: data.version,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      settings: parseSettings(data.settings),
      habits,
      entries,
    },
  };
}

/* ---------- Dry run ---------- */

export interface ImportPlan {
  newHabits: number;
  /** Habits that already exist (same id) but whose definition differs. */
  changedHabits: number;
  unchangedHabits: number;
  /** Day values/notes not in the current data — always imported. */
  newEntries: number;
  /** Already present with the same value — nothing to do. */
  sameEntries: number;
  /** Present with a different value — only replaced if the user confirms. */
  conflicts: number;
}

const sameHabit = (a: Habit, b: Habit) =>
  JSON.stringify(normHabit(a)) === JSON.stringify(normHabit(b));
function normHabit(h: Habit) {
  // Compare everything the user controls; order/createdAt are bookkeeping.
  const { order: _o, createdAt: _c, ...rest } = h;
  return Object.fromEntries(Object.entries(rest).sort(([x], [y]) => x.localeCompare(y)));
}

type Cell = { kind: 'value' | 'note'; habitId: string; date: DateStr; value: EntryValue | string };

function* cells(backup: Backup): Generator<Cell> {
  for (const h of backup.habits) {
    const e = backup.entries[h.id];
    if (!e) continue;
    for (const [date, value] of Object.entries(e.values))
      yield { kind: 'value', habitId: h.id, date, value };
    for (const [date, value] of Object.entries(e.notes))
      yield { kind: 'note', habitId: h.id, date, value };
  }
}

function current(cell: Cell, currentEntries: EntriesFor): EntryValue | string | undefined {
  const e = currentEntries(cell.habitId);
  return cell.kind === 'value' ? e.values[cell.date] : e.notes[cell.date];
}

export function planImport(
  backup: Backup,
  currentHabits: Habit[],
  currentEntries: EntriesFor,
): ImportPlan {
  const byId = new Map(currentHabits.map((h) => [h.id, h]));
  const plan: ImportPlan = {
    newHabits: 0,
    changedHabits: 0,
    unchangedHabits: 0,
    newEntries: 0,
    sameEntries: 0,
    conflicts: 0,
  };
  for (const h of backup.habits) {
    const cur = byId.get(h.id);
    if (!cur) plan.newHabits++;
    else if (sameHabit(cur, h)) plan.unchangedHabits++;
    else plan.changedHabits++;
  }
  for (const c of cells(backup)) {
    const cur = current(c, currentEntries);
    if (cur === undefined) plan.newEntries++;
    else if (cur === c.value) plan.sameEntries++;
    else plan.conflicts++;
  }
  return plan;
}

/* ---------- Writes ---------- */

export interface EntryDocWrite {
  habitId: string;
  year: number;
  values: Record<DateStr, EntryValue>;
  notes: Record<DateStr, string>;
}

export interface ImportWrites {
  /** Full habit documents to write (new habits, plus changed ones when overwriting). */
  habits: Habit[];
  /** Per habit-year: only the day values/notes that should be written (merged into existing docs). */
  entryDocs: EntryDocWrite[];
  settings: Settings | null;
}

export function importWrites(
  backup: Backup,
  currentHabits: Habit[],
  currentEntries: EntriesFor,
  opts: { overwrite: boolean; restoreSettings: boolean },
): ImportWrites {
  const byId = new Map(currentHabits.map((h) => [h.id, h]));
  // New habits go after the current ones, keeping the backup's relative order
  // (and its exact order numbers when the account is empty).
  const curMax = currentHabits.reduce((m, h) => Math.max(m, h.order), -Infinity);
  const backupMin = backup.habits.reduce((m, h) => Math.min(m, h.order), Infinity);
  const offset = currentHabits.length ? curMax + 1 - backupMin : 0;

  const habits: Habit[] = [];
  for (const h of backup.habits) {
    const cur = byId.get(h.id);
    if (!cur) habits.push({ ...h, order: h.order + offset });
    else if (opts.overwrite && !sameHabit(cur, h)) habits.push({ ...h, order: cur.order });
  }

  const docs = new Map<string, EntryDocWrite>();
  for (const c of cells(backup)) {
    const cur = current(c, currentEntries);
    if (cur === c.value || (cur !== undefined && !opts.overwrite)) continue;
    const year = yearOf(c.date);
    const key = `${c.habitId}_${year}`;
    let d = docs.get(key);
    if (!d) docs.set(key, (d = { habitId: c.habitId, year, values: {}, notes: {} }));
    if (c.kind === 'value') d.values[c.date] = c.value as EntryValue;
    else d.notes[c.date] = c.value as string;
  }

  return {
    habits,
    entryDocs: [...docs.values()],
    settings: opts.restoreSettings ? backup.settings : null,
  };
}

/** Filename-safe date stamp, e.g. tally-backup-2026-11-02.json */
export function exportFileName(kind: 'csv' | 'json', today: DateStr): string {
  return kind === 'csv' ? `tally-${today}.csv` : `tally-backup-${today}.json`;
}
