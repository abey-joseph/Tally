/**
 * Live data for the signed-in user.
 *
 * Three real-time listeners (user doc, habits, entries) feed React state.
 * Writes are "fire and forget": Firestore applies them to its local cache and
 * notifies the listeners immediately (optimistic UI), then syncs to the server
 * in the background — including later, if the device is offline right now.
 */
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getFirebase } from '../firebase/config';
import { isEditable, todayIn, yearOf } from '../lib/dates';
import {
  DEFAULT_SETTINGS,
  type DateStr,
  type EntryValue,
  type Habit,
  type Settings,
} from '../lib/types';
import {
  byOrder,
  emptyHabitEntries,
  entryDocId,
  habitToDoc,
  mergeEntryDocs,
  parseHabit,
  parseSettings,
  type HabitEntries,
} from './model';
import type { ImportWrites } from '../lib/backup';
import { useToday } from './useToday';

export type NewHabit = Omit<Habit, 'id' | 'order' | 'createdAt'>;

export interface DataContextValue {
  uid: string;
  loading: boolean;
  /** A listener failed (e.g. permission denied). */
  error: string | null;
  /** Last failed write, shown to the user; cleared by `dismissWriteError`. */
  writeError: string | null;
  dismissWriteError: () => void;
  /** Local changes not yet confirmed by the server. */
  hasPendingWrites: boolean;
  online: boolean;

  settings: Settings;
  /** All habits (including archived), sorted by manual order. */
  habits: Habit[];
  entriesFor: (habitId: string) => HabitEntries;
  /** Today's date in the configured time zone; updates at midnight. */
  today: DateStr;

  setEntry: (
    habitId: string,
    date: DateStr,
    value: EntryValue | null,
    note?: string | null,
  ) => void;
  createHabit: (habit: NewHabit) => string;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id'>>) => void;
  deleteHabit: (id: string) => void;
  reorderHabits: (orderedIds: string[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Applies a planned import (see lib/backup). Resolves once written locally; syncs in the background. */
  importData: (writes: ImportWrites) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const refs = (db: Firestore, uid: string) => ({
  user: doc(db, 'users', uid),
  habits: collection(db, 'users', uid, 'habits'),
  habit: (id: string) => doc(db, 'users', uid, 'habits', id),
  entries: collection(db, 'users', uid, 'entries'),
  entryDoc: (id: string) => doc(db, 'users', uid, 'entries', id),
});

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const { db } = getFirebase();
  const r = useMemo(() => refs(db, uid), [db, uid]);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Map<string, HabitEntries>>(new Map());
  /** Entry doc ids per habit, so a habit's entries can be deleted with it. */
  const [entryDocIds, setEntryDocIds] = useState<Map<string, string[]>>(new Map());
  const [loaded, setLoaded] = useState({ user: false, habits: false, entries: false });
  const [pending, setPending] = useState({ user: false, habits: false, entries: false });
  const [error, setError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const online = useOnline();
  const today = useToday(settings.timezone);

  useEffect(() => {
    const onErr = (what: string) => (err: Error) => {
      console.error(`[data] ${what} listener failed`, err);
      setError(`Couldn't load ${what}: ${err.message}`);
    };
    const opts = { includeMetadataChanges: true };

    const unsubUser = onSnapshot(
      r.user,
      opts,
      (snap) => {
        setSettings(parseSettings(snap.get('settings')));
        setPending((p) => ({ ...p, user: snap.metadata.hasPendingWrites }));
        setLoaded((l) => ({ ...l, user: true }));
        // First sign-in: create the user document (only once the server confirms it's missing).
        if (!snap.exists() && !snap.metadata.fromCache) {
          setDoc(
            r.user,
            { settings: DEFAULT_SETTINGS, createdAt: serverTimestamp() },
            { merge: true },
          ).catch(onErr('profile'));
        }
      },
      onErr('settings'),
    );

    const unsubHabits = onSnapshot(
      r.habits,
      opts,
      (snap) => {
        const list: Habit[] = [];
        snap.forEach((d) => {
          const h = parseHabit(d.id, d.data());
          if (h) list.push(h);
          else console.warn('[data] ignoring invalid habit document', d.id);
        });
        setHabits(list.sort(byOrder));
        setPending((p) => ({ ...p, habits: snap.metadata.hasPendingWrites }));
        setLoaded((l) => ({ ...l, habits: true }));
      },
      onErr('habits'),
    );

    const unsubEntries = onSnapshot(
      r.entries,
      opts,
      (snap) => {
        const docs: unknown[] = [];
        const ids = new Map<string, string[]>();
        snap.forEach((d) => {
          const data = d.data();
          docs.push(data);
          const hid = typeof data.habitId === 'string' ? data.habitId : null;
          if (hid) ids.set(hid, [...(ids.get(hid) ?? []), d.id]);
        });
        setEntries(mergeEntryDocs(docs));
        setEntryDocIds(ids);
        setPending((p) => ({ ...p, entries: snap.metadata.hasPendingWrites }));
        setLoaded((l) => ({ ...l, entries: true }));
      },
      onErr('entries'),
    );

    return () => {
      unsubUser();
      unsubHabits();
      unsubEntries();
    };
  }, [r]);

  /** Runs a write without awaiting it (so the UI never blocks offline) and reports failures. */
  const fire = useCallback((what: string, p: Promise<unknown>) => {
    p.catch((err: Error) => {
      console.error(`[data] ${what} failed`, err);
      setWriteError(`Couldn't save ${what}. ${err.message}`);
    });
  }, []);

  const setEntry = useCallback<DataContextValue['setEntry']>(
    (habitId, date, value, note) => {
      if (!isEditable(date, todayIn(settings.timezone))) return; // never edit the future
      const payload: Record<string, unknown> = {
        habitId,
        year: yearOf(date),
        values: { [date]: value === null ? deleteField() : value },
      };
      if (note !== undefined) {
        payload.notes = { [date]: note === null || !note.trim() ? deleteField() : note.trim() };
      }
      fire('entry', setDoc(r.entryDoc(entryDocId(habitId, date)), payload, { merge: true }));
    },
    [r, fire, settings.timezone],
  );

  const createHabit = useCallback<DataContextValue['createHabit']>(
    (input) => {
      const ref = doc(r.habits);
      const order = habits.reduce((max, h) => Math.max(max, h.order), -1) + 1;
      const habit: Habit = { ...input, id: ref.id, order, createdAt: new Date().toISOString() };
      fire('habit', setDoc(ref, habitToDoc(habit)));
      return ref.id;
    },
    [r, fire, habits],
  );

  const updateHabit = useCallback<DataContextValue['updateHabit']>(
    (id, patch) => {
      const clean = Object.fromEntries(
        Object.entries(patch).map(([k, v]) => [k, v === undefined ? deleteField() : v]),
      );
      // updateDoc replaces each top-level field (e.g. a whole `frequency` object) instead of deep-merging.
      fire('habit', updateDoc(r.habit(id), clean));
    },
    [r, fire],
  );

  const deleteHabit = useCallback<DataContextValue['deleteHabit']>(
    (id) => {
      const batch = writeBatch(db);
      batch.delete(r.habit(id));
      for (const docId of entryDocIds.get(id) ?? []) batch.delete(r.entryDoc(docId));
      fire('deletion', batch.commit());
    },
    [db, r, fire, entryDocIds],
  );

  const reorderHabits = useCallback<DataContextValue['reorderHabits']>(
    (orderedIds) => {
      const batch = writeBatch(db);
      orderedIds.forEach((id, i) => {
        const h = habits.find((x) => x.id === id);
        if (h && h.order !== i) batch.update(r.habit(id), { order: i });
      });
      fire('order', batch.commit());
    },
    [db, r, fire, habits],
  );

  const updateSettings = useCallback<DataContextValue['updateSettings']>(
    (patch) => fire('settings', setDoc(r.user, { settings: patch }, { merge: true })),
    [r, fire],
  );

  const importData = useCallback<DataContextValue['importData']>(
    async (w) => {
      // Batches are limited to 500 operations; stay well under.
      const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
      for (const h of w.habits) ops.push((b) => b.set(r.habit(h.id), habitToDoc(h)));
      for (const d of w.entryDocs) {
        ops.push((b) =>
          b.set(
            r.entryDoc(`${d.habitId}_${d.year}`),
            { habitId: d.habitId, year: d.year, values: d.values, notes: d.notes },
            { merge: true },
          ),
        );
      }
      if (w.settings) ops.push((b) => b.set(r.user, { settings: w.settings }, { merge: true }));
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach((op) => op(batch));
        // Not awaited: offline, commit() only resolves once the server confirms.
        fire('import', batch.commit());
      }
    },
    [db, r, fire],
  );

  const entriesFor = useCallback((habitId: string) => entries.get(habitId) ?? EMPTY, [entries]);

  const value = useMemo<DataContextValue>(
    () => ({
      uid,
      loading: !(loaded.user && loaded.habits && loaded.entries),
      error,
      writeError,
      dismissWriteError: () => setWriteError(null),
      hasPendingWrites: pending.user || pending.habits || pending.entries,
      online,
      settings,
      habits,
      entriesFor,
      today,
      setEntry,
      createHabit,
      updateHabit,
      deleteHabit,
      reorderHabits,
      updateSettings,
      importData,
    }),
    [
      uid,
      loaded,
      error,
      writeError,
      pending,
      online,
      settings,
      habits,
      entriesFor,
      today,
      setEntry,
      createHabit,
      updateHabit,
      deleteHabit,
      reorderHabits,
      updateSettings,
      importData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

const EMPTY: HabitEntries = Object.freeze(emptyHabitEntries()) as HabitEntries;

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
