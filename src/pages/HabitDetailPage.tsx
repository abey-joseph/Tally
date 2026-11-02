import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppBar from '../components/AppBar';
import CalendarCard from '../components/detail/CalendarCard';
import FrequencyCard from '../components/detail/FrequencyCard';
import HistoryChart from '../components/detail/HistoryChart';
import OverviewCard from '../components/detail/OverviewCard';
import ScoreChart from '../components/detail/ScoreChart';
import StreaksCard from '../components/detail/StreaksCard';
import { EditIcon } from '../components/icons';
import NumberSheet from '../components/NumberSheet';
import { useData } from '../data/DataProvider';
import { nextBooleanValue } from '../lib/cycle';
import { isEditable } from '../lib/dates';
import { describeSchedule } from '../lib/describe';
import { shortDateWithYear } from '../lib/format';
import { analyzeHabit, computeOverview } from '../lib/stats';
import type { DateStr } from '../lib/types';

export default function HabitDetailPage() {
  const { id } = useParams();
  const { habits, entriesFor, today, settings, setEntry } = useData();
  const habit = habits.find((h) => h.id === id);
  const entries = habit ? entriesFor(habit.id) : null;
  const [sheetDate, setSheetDate] = useState<DateStr | null>(null);

  const analysis = useMemo(
    () => (habit && entries ? analyzeHabit(habit, entries.values, today) : null),
    [habit, entries, today],
  );
  const overview = useMemo(
    () => (habit && analysis ? computeOverview(habit, analysis.timeline, analysis.scores) : null),
    [habit, analysis],
  );

  const onTapDay = useCallback(
    (date: DateStr) => {
      if (!habit || !entries || !isEditable(date, today)) return;
      if (habit.type === 'numeric') setSheetDate(date);
      else setEntry(habit.id, date, nextBooleanValue(entries.values[date]));
    },
    [habit, entries, today, setEntry],
  );

  if (!habit || !entries || !analysis || !overview) {
    return (
      <>
        <AppBar title="Habit" />
        <main className="mx-auto max-w-[720px] px-4 py-16 text-center text-neutral-500 dark:text-neutral-400">
          <p className="mb-6">This habit doesn’t exist (it may have been deleted).</p>
          <Link to="/" className="font-semibold text-neutral-900 underline dark:text-neutral-100">
            Back to habits
          </Link>
        </main>
      </>
    );
  }

  return (
    <div style={{ '--habit': habit.color } as CSSProperties}>
      <AppBar
        title={habit.name}
        actions={
          <Link to={`/habit/${habit.id}/edit`} aria-label="Edit habit" className="icon-btn">
            <EditIcon size={22} />
          </Link>
        }
      />
      <main className="mx-auto max-w-[720px] space-y-4 px-4 pt-1 pb-24">
        <div className="space-y-1 px-1 text-sm text-neutral-600 dark:text-neutral-300">
          {habit.question && (
            <p className="text-base text-neutral-900 dark:text-neutral-100">{habit.question}</p>
          )}
          <p>
            {describeSchedule(habit)} · since {shortDateWithYear(habit.startDate)}
            {habit.archived && (
              <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs dark:bg-neutral-700">
                Archived
              </span>
            )}
          </p>
          {habit.description && <p className="whitespace-pre-line">{habit.description}</p>}
        </div>

        <OverviewCard habit={habit} overview={overview} />
        <ScoreChart scores={analysis.scores} weekStart={settings.weekStart} />
        <HistoryChart habit={habit} timeline={analysis.timeline} weekStart={settings.weekStart} />
        <CalendarCard
          habit={habit}
          timeline={analysis.timeline}
          weekStart={settings.weekStart}
          onTapDay={onTapDay}
        />
        <StreaksCard streaks={analysis.streaks} />
        <FrequencyCard habit={habit} timeline={analysis.timeline} weekStart={settings.weekStart} />
      </main>

      {sheetDate && (
        <NumberSheet
          habit={habit}
          date={sheetDate}
          value={entries.values[sheetDate]}
          note={entries.notes[sheetDate]}
          onClose={() => setSheetDate(null)}
          onSave={(value, note) => {
            setEntry(habit.id, sheetDate, value, note);
            setSheetDate(null);
          }}
        />
      )}
    </div>
  );
}
