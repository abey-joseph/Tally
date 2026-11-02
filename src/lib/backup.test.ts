import { describe, expect, it } from 'vitest';
import type { HabitEntries } from '../data/model';
import {
  buildBackup,
  exportFileName,
  importWrites,
  parseBackup,
  planImport,
  toCsv,
  type Backup,
} from './backup';
import { makeHabit } from './test-helpers';
import { DEFAULT_SETTINGS, type Habit } from './types';

// Shaped like real stored data (habits read from Firestore are already normalised by parseHabit).
const run = makeHabit({
  id: 'run',
  name: 'Run',
  type: 'numeric',
  unit: 'km',
  target: 5,
  targetType: 'atLeast',
  order: 1,
});
const read = makeHabit({ id: 'read', name: 'Read, "slowly"', order: 0, question: 'Did you read?' });
const data: Record<string, HabitEntries> = {
  run: { values: { '2026-11-01': 5.5, '2025-12-31': 's' }, notes: { '2026-11-01': 'Easy,\nfun' } },
  read: { values: { '2026-11-01': 'y', '2026-10-31': 'n' }, notes: { '2026-10-30': 'note only' } },
};
const entriesOf = (src: Record<string, HabitEntries>) => (id: string) =>
  src[id] ?? { values: {}, notes: {} };

function applyWrites(
  habits: Habit[],
  entries: Record<string, HabitEntries>,
  w: ReturnType<typeof importWrites>,
) {
  const hs = new Map(habits.map((h) => [h.id, h]));
  for (const h of w.habits) hs.set(h.id, h);
  const es: Record<string, HabitEntries> = structuredClone(entries);
  for (const d of w.entryDocs) {
    const e = (es[d.habitId] ??= { values: {}, notes: {} });
    Object.assign(e.values, d.values);
    Object.assign(e.notes, d.notes);
  }
  return { habits: [...hs.values()], entries: es };
}

describe('toCsv', () => {
  it('writes one row per habit per day with data, sorted by date then habit order', () => {
    const csv = toCsv([read, run], entriesOf(data));
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'date,habit,value,note',
      '2025-12-31,Run,skipped,',
      '2026-10-30,"Read, ""slowly""",,note only',
      '2026-10-31,"Read, ""slowly""",no,',
      '2026-11-01,"Read, ""slowly""",yes,',
      '2026-11-01,Run,5.5,"Easy,\nfun"',
      '',
    ]);
  });

  it('has just a header when there is no data', () => {
    expect(toCsv([], entriesOf({}))).toBe('﻿date,habit,value,note\r\n');
  });
});

describe('JSON backup round-trip', () => {
  const backup = buildBackup(
    { ...DEFAULT_SETTINGS, theme: 'dark', weekStart: 0 },
    [read, run],
    entriesOf(data),
    '2026-11-02T10:00:00.000Z',
  );

  it('lists dates in order regardless of how they were stored', () => {
    expect(Object.keys(backup.entries.run!.values)).toEqual(['2025-12-31', '2026-11-01']);
  });

  it('export → parse gives back the same data', () => {
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed).toEqual({ ok: true, skippedHabits: 0, backup });
  });

  it('import into an empty account → export again is identical (no data loss)', () => {
    const parsed = parseBackup(JSON.stringify(backup));
    if (!parsed.ok) throw new Error(parsed.error);
    const w = importWrites(parsed.backup, [], entriesOf({}), {
      overwrite: false,
      restoreSettings: true,
    });
    const after = applyWrites([], {}, w);
    const again = buildBackup(
      w.settings!,
      after.habits,
      entriesOf(after.entries),
      backup.exportedAt,
    );
    expect(again).toEqual(backup);
  });
});

describe('parseBackup', () => {
  const valid = (over: object = {}) =>
    JSON.stringify({ app: 'tally', version: 1, habits: [], entries: {}, ...over });

  it('rejects files that are not Tally backups', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'This file isn’t valid JSON.' });
    expect(parseBackup('{"app":"other"}')).toMatchObject({ ok: false, error: /Tally backup/ });
    expect(parseBackup(valid({ version: 99 }))).toMatchObject({
      ok: false,
      error: /newer version/,
    });
    expect(parseBackup(valid({ habits: 'x' }))).toMatchObject({ ok: false });
  });

  it('skips invalid or duplicate habits and orphan entries, keeps the rest', () => {
    const r = parseBackup(
      valid({
        habits: [read, { ...run, frequency: { kind: 'nope' } }, { ...read }, { name: 'no id' }],
        entries: {
          read: { values: { '2026-11-01': 'y', bad: 'y' } },
          ghost: { values: { '2026-01-01': 'y' } },
        },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.skippedHabits).toBe(3);
    expect(r.backup.habits.map((h) => h.id)).toEqual(['read']);
    expect(r.backup.entries).toEqual({ read: { values: { '2026-11-01': 'y' }, notes: {} } });
    expect(r.backup.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('planImport + importWrites', () => {
  const backup: Backup = buildBackup(DEFAULT_SETTINGS, [read, run], entriesOf(data), '');
  const currentRead = { ...read, name: 'Reading' }; // changed definition
  const current: Record<string, HabitEntries> = {
    read: { values: { '2026-11-01': 'y', '2026-10-31': 'y' }, notes: {} }, // same, conflict
  };

  it('dry run counts new, same and conflicting data', () => {
    expect(planImport(backup, [currentRead], entriesOf(current))).toEqual({
      newHabits: 1,
      changedHabits: 1,
      unchangedHabits: 0,
      newEntries: 4, // run ×2 values + 1 note, read note
      sameEntries: 1,
      conflicts: 1,
    });
  });

  it('without confirmation, never overwrites existing entries or habits', () => {
    const w = importWrites(backup, [currentRead], entriesOf(current), {
      overwrite: false,
      restoreSettings: false,
    });
    expect(w.habits.map((h) => h.id)).toEqual(['run']);
    expect(w.settings).toBeNull();
    const after = applyWrites([currentRead], current, w);
    expect(after.entries.read!.values['2026-10-31']).toBe('y'); // kept
    expect(after.entries.read!.notes['2026-10-30']).toBe('note only'); // new note added
    expect(after.habits.find((h) => h.id === 'read')!.name).toBe('Reading'); // kept
    expect(after.entries.run).toEqual(data.run);
  });

  it('with confirmation, replaces conflicting values and changed habits', () => {
    const w = importWrites(backup, [currentRead], entriesOf(current), {
      overwrite: true,
      restoreSettings: false,
    });
    const after = applyWrites([currentRead], current, w);
    expect(after.entries.read!.values['2026-10-31']).toBe('n');
    expect(after.habits.find((h) => h.id === 'read')!.name).toBe('Read, "slowly"');
  });

  it('writes are grouped per habit per year and skip identical values', () => {
    const w = importWrites(backup, [], entriesOf({}), { overwrite: false, restoreSettings: false });
    expect(w.entryDocs.map((d) => `${d.habitId}_${d.year}`).sort()).toEqual([
      'read_2026',
      'run_2025',
      'run_2026',
    ]);
    const same = importWrites(backup, [read, run], entriesOf(data), {
      overwrite: true,
      restoreSettings: false,
    });
    expect(same).toEqual({ habits: [], entryDocs: [], settings: null });
  });

  it('new habits go after existing ones, keeping their relative order', () => {
    const existing = makeHabit({ id: 'x', order: 7 });
    const w = importWrites(backup, [existing], entriesOf({}), {
      overwrite: false,
      restoreSettings: false,
    });
    expect(w.habits.map((h) => [h.id, h.order])).toEqual([
      ['read', 8],
      ['run', 9],
    ]);
  });
});

describe('exportFileName', () => {
  it('stamps the date', () => {
    expect(exportFileName('csv', '2026-11-02')).toBe('tally-2026-11-02.csv');
    expect(exportFileName('json', '2026-11-02')).toBe('tally-backup-2026-11-02.json');
  });
});
