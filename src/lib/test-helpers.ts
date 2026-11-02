import { addDays } from './dates';
import type { EntryMap, EntryValue, Habit } from './types';

/** Monday 2 Nov 2026 — used as "today" across tests. */
export const TODAY = '2026-11-02';

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test habit',
    type: 'boolean',
    frequency: { kind: 'daily' },
    color: '#1f7a5c',
    order: 0,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    startDate: '2026-01-01',
    ...overrides,
  };
}

/** Entries with the same value on `count` consecutive days starting at `from`. */
export function run(from: string, count: number, value: EntryValue = 'y'): EntryMap {
  const out: EntryMap = {};
  for (let i = 0; i < count; i++) out[addDays(from, i)] = value;
  return out;
}
