import { useEffect, useId, useRef, useState } from 'react';
import { formatNumber, longDate, parseAmount } from '../lib/format';
import type { DateStr, EntryValue, Habit } from '../lib/types';
import { MinusIcon, PlusIcon } from './icons';

interface NumberSheetProps {
  habit: Habit;
  date: DateStr;
  value: EntryValue | undefined;
  note: string | undefined;
  onSave: (value: EntryValue | null, note: string | null) => void;
  onClose: () => void;
}

/** Bottom sheet for entering a Measurable habit's value (and an optional note) for one day. */
export default function NumberSheet({
  habit,
  date,
  value,
  note,
  onSave,
  onClose,
}: NumberSheetProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(typeof value === 'number' ? String(value) : '');
  const [noteText, setNoteText] = useState(note ?? '');
  const parsed = text.trim() === '' ? null : parseAmount(text);
  const invalid = text.trim() !== '' && parsed === null;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const step = (delta: number) => {
    const next = Math.max(0, Math.round(((parsed ?? 0) + delta) * 100) / 100);
    setText(String(next));
  };

  const save = () => {
    if (invalid) return;
    onSave(parsed, noteText.trim() || null);
  };

  const target =
    habit.target !== undefined
      ? `${habit.targetType === 'atMost' ? 'At most' : 'At least'} ${formatNumber(habit.target)}${habit.unit ? ` ${habit.unit}` : ''}`
      : null;

  const btn =
    'min-h-11 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div aria-hidden className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl dark:bg-neutral-800"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h2 id={titleId} className="text-lg font-semibold">
            {habit.name}
          </h2>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            {longDate(date)}
            {target ? ` · ${target}` : ''}
          </p>

          <div className="mb-1 flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease by 1"
              onClick={() => step(-1)}
              className={`${btn} flex w-11 items-center justify-center bg-neutral-100 px-0 dark:bg-neutral-700`}
            >
              <MinusIcon size={20} />
            </button>
            <label className="relative flex-1">
              <span className="sr-only">Value{habit.unit ? ` in ${habit.unit}` : ''}</span>
              <input
                ref={inputRef}
                inputMode="decimal"
                autoComplete="off"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-invalid={invalid}
                placeholder="0"
                className="h-12 w-full rounded-xl border border-neutral-300 bg-transparent px-3 pr-14 text-center text-2xl font-semibold tabular-nums outline-none focus:border-neutral-500 dark:border-neutral-600"
                style={{ caretColor: habit.color }}
              />
              {habit.unit && (
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
                  {habit.unit}
                </span>
              )}
            </label>
            <button
              type="button"
              aria-label="Increase by 1"
              onClick={() => step(1)}
              className={`${btn} flex w-11 items-center justify-center bg-neutral-100 px-0 dark:bg-neutral-700`}
            >
              <PlusIcon size={20} />
            </button>
          </div>
          <p className="mb-3 h-5 text-sm text-red-700 dark:text-red-400" role="alert">
            {invalid ? 'Enter a number, e.g. 2.5' : ''}
          </p>

          <label className="mb-5 block">
            <span className="mb-1 block text-sm text-neutral-500 dark:text-neutral-400">
              Note (optional)
            </span>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-neutral-300 bg-transparent p-3 text-base outline-none focus:border-neutral-500 dark:border-neutral-600"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSave('s', noteText.trim() || null)}
              className={`${btn} text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700`}
            >
              Skip day
            </button>
            {value !== undefined && (
              <button
                type="button"
                onClick={() => onSave(null, null)}
                className={`${btn} text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700`}
              >
                Clear
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className={`${btn} text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={invalid}
              className={`${btn} bg-neutral-900 px-6 text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900`}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
