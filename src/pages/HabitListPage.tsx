import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HabitRow from '../components/HabitRow';
import Menu from '../components/Menu';
import NumberSheet from '../components/NumberSheet';
import ReorderList from '../components/ReorderList';
import {
  ArchiveIcon,
  CloudOffIcon,
  PlusIcon,
  SettingsIcon,
  SortIcon,
  SyncIcon,
} from '../components/icons';
import { useData } from '../data/DataProvider';
import { nextBooleanValue } from '../lib/cycle';
import { addDays } from '../lib/dates';
import { dayOfMonth, weekdayShort } from '../lib/format';
import { sortHabits } from '../lib/sort';
import { analyzeHabit, type HabitAnalysis } from '../lib/stats';
import type { DateStr, Habit, SortBy } from '../lib/types';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'manual', label: 'Manual order' },
  { value: 'name', label: 'Name' },
  { value: 'score', label: 'Score' },
  { value: 'color', label: 'Colour' },
];

export default function HabitListPage() {
  const data = useData();
  const { habits, settings, today, entriesFor, setEntry, updateSettings, reorderHabits } = data;
  const [params, setParams] = useSearchParams();
  const showArchived = params.get('archived') === '1';
  const reordering = params.get('reorder') === '1';
  const [sheet, setSheet] = useState<{ habit: Habit; date: DateStr } | null>(null);

  // Columns: the last `daysShown` days; newest on the left when `newestFirst` (like Loop).
  const dates = useMemo(() => {
    const list = Array.from({ length: settings.daysShown }, (_, i) => addDays(today, -i));
    return settings.newestFirst ? list : list.reverse();
  }, [today, settings.daysShown, settings.newestFirst]);

  const analyses = useMemo(() => {
    const map = new Map<string, HabitAnalysis>();
    for (const h of habits) map.set(h.id, analyzeHabit(h, entriesFor(h.id).values, today));
    return map;
  }, [habits, entriesFor, today]);

  const visible = useMemo(() => {
    const scores = new Map([...analyses].map(([id, a]) => [id, a.score]));
    const sorted = sortHabits(habits, settings.sortBy, scores);
    const active = sorted.filter((h) => !h.archived);
    return showArchived ? [...active, ...sorted.filter((h) => h.archived)] : active;
  }, [habits, analyses, settings.sortBy, showArchived]);

  const archivedCount = habits.filter((h) => h.archived).length;

  const onTapDay = useCallback(
    (habit: Habit, date: DateStr) => {
      if (habit.type === 'numeric') {
        setSheet({ habit, date });
        return;
      }
      setEntry(habit.id, date, nextBooleanValue(entriesFor(habit.id).values[date]));
    },
    [entriesFor, setEntry],
  );

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur dark:bg-neutral-900/95 [html.black_&]:bg-black/95">
        {reordering ? (
          <div className="flex h-14 items-center gap-1 px-2 pl-4">
            <h1 className="flex-1 text-xl font-semibold">Reorder habits</h1>
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              className="min-h-11 rounded-full bg-neutral-900 px-5 font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex h-14 items-center gap-1 px-2 pl-4">
            <h1 className="text-xl font-semibold">Tally</h1>
            <SyncStatus online={data.online} syncing={data.hasPendingWrites} />
            <span className="flex-1" />
            <Menu
              label="Sort habits"
              icon={<SortIcon size={22} />}
              value={settings.sortBy}
              options={SORT_OPTIONS}
              onChange={(sortBy) => updateSettings({ sortBy })}
              actions={
                habits.some((h) => !h.archived)
                  ? [
                      {
                        label: 'Reorder…',
                        onSelect: () => {
                          if (settings.sortBy !== 'manual') updateSettings({ sortBy: 'manual' });
                          setParams({ reorder: '1' }, { replace: true });
                        },
                      },
                    ]
                  : undefined
              }
            />
            <button
              type="button"
              aria-label={showArchived ? 'Hide archived habits' : 'Show archived habits'}
              aria-pressed={showArchived}
              onClick={() => setParams(showArchived ? {} : { archived: '1' }, { replace: true })}
              className={`icon-btn ${showArchived ? 'bg-neutral-200 dark:bg-neutral-700' : ''}`}
            >
              <ArchiveIcon size={22} />
            </button>
            <Link to="/habit/new" aria-label="Add habit" className="icon-btn">
              <PlusIcon size={24} />
            </Link>
            <Link to="/settings" aria-label="Settings" className="icon-btn">
              <SettingsIcon size={22} />
            </Link>
          </div>
        )}

        {visible.length > 0 && !reordering && (
          <div className="flex items-end border-b border-neutral-200 px-2 pb-1 dark:border-neutral-800">
            <span className="flex-1" />
            {dates.map((d) => (
              <div
                key={d}
                className={`w-11 text-center text-xs leading-tight ${d === today ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
              >
                <div>{weekdayShort(d)}</div>
                <div className="text-sm">{dayOfMonth(d)}</div>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="px-2 pb-24">
        {reordering ? (
          <ReorderList
            habits={sortHabits(
              habits.filter((h) => !h.archived),
              'manual',
              new Map(),
            )}
            onSave={reorderHabits}
          />
        ) : visible.length === 0 ? (
          <div className="px-6 py-20 text-center text-neutral-500 dark:text-neutral-400">
            <p>
              {archivedCount > 0 && !showArchived
                ? 'All your habits are archived.'
                : 'No habits yet — tap + to create your first one.'}
            </p>
            <Link
              to="/habit/new"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-900 px-6 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              <PlusIcon size={20} /> New habit
            </Link>
          </div>
        ) : (
          <ul aria-label="Habits">
            {visible.map((h) => {
              const a = analyses.get(h.id)!;
              return (
                <HabitRow
                  key={h.id}
                  habit={h}
                  score={a.score}
                  timeline={a.timeline}
                  dates={dates}
                  onTapDay={onTapDay}
                />
              );
            })}
          </ul>
        )}
      </main>

      {sheet && (
        <NumberSheet
          habit={sheet.habit}
          date={sheet.date}
          value={entriesFor(sheet.habit.id).values[sheet.date]}
          note={entriesFor(sheet.habit.id).notes[sheet.date]}
          onClose={() => setSheet(null)}
          onSave={(value, note) => {
            setEntry(sheet.habit.id, sheet.date, value, note);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function SyncStatus({ online, syncing }: { online: boolean; syncing: boolean }) {
  if (!online) {
    return (
      <span
        role="status"
        className="ml-2 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
      >
        <CloudOffIcon size={14} /> Offline
      </span>
    );
  }
  if (syncing) {
    return (
      <span
        role="status"
        className="ml-2 inline-flex items-center text-neutral-400"
        title="Syncing"
      >
        <SyncIcon size={14} className="animate-spin [animation-duration:2s]" />
        <span className="sr-only">Syncing</span>
      </span>
    );
  }
  return null;
}
