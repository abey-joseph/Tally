import { useId, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppBar from '../components/AppBar';
import ConfirmDialog from '../components/ConfirmDialog';
import { ArchiveIcon, CheckIcon, TrashIcon } from '../components/icons';
import { useGoBack } from '../components/useGoBack';
import { useData } from '../data/DataProvider';
import { PALETTE } from '../lib/colors';
import {
  emptyForm,
  formFromHabit,
  LIMITS,
  suggestColor,
  validateForm,
  type FormErrors,
  type FormField,
  type HabitForm,
} from '../lib/habitForm';
import type { Frequency, Habit, HabitType } from '../lib/types';

export default function HabitEditPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { habits } = useData();

  if (id) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return <HabitNotFound />;
    return <HabitFormView key={habit.id} habit={habit} />;
  }

  const type = params.get('type');
  if (type !== 'boolean' && type !== 'numeric') {
    return <TypeChooser onChoose={(t) => setParams({ type: t })} />;
  }
  return <HabitFormView key={type} newType={type} />;
}

/* ---------- Step 1 (new habits): choose the type ---------- */

function TypeChooser({ onChoose }: { onChoose: (t: HabitType) => void }) {
  const option = (t: HabitType, title: string, example: string) => (
    <button
      type="button"
      onClick={() => onChoose(t)}
      className="card w-full p-5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-neutral-500 dark:hover:bg-neutral-800"
    >
      <span className="block text-lg font-semibold">{title}</span>
      <span className="mt-1 block text-neutral-500 dark:text-neutral-400">{example}</span>
    </button>
  );
  return (
    <>
      <AppBar title="New habit" />
      <main className="mx-auto max-w-[720px] space-y-3 px-4 pt-2 pb-16">
        <p className="pb-1 text-neutral-500 dark:text-neutral-400">What kind of habit is it?</p>
        {option('boolean', 'Yes or No', 'e.g. Did you exercise today? Did you read?')}
        {option('numeric', 'Measurable', 'e.g. How many km did you run? How many pages?')}
      </main>
    </>
  );
}

function HabitNotFound() {
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

/* ---------- Step 2: the form ---------- */

const FIELD_ORDER: FormField[] = [
  'name',
  'question',
  'times',
  'n',
  'unit',
  'target',
  'startDate',
  'description',
];

function HabitFormView({ habit, newType }: { habit?: Habit; newType?: HabitType }) {
  const { habits, today, createHabit, updateHabit, deleteHabit } = useData();
  const navigate = useNavigate();
  const goBack = useGoBack(habit ? `/habit/${habit.id}` : '/');
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<HabitForm>(() =>
    habit
      ? formFromHabit(habit)
      : emptyForm(
          newType ?? 'boolean',
          today,
          suggestColor(
            PALETTE.map((c) => c.value),
            habits.map((h) => h.color),
          ),
        ),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { errors, fields } = validateForm(form, today);
  const visibleErrors: FormErrors = showErrors ? errors : {};
  const set = <K extends keyof HabitForm>(key: K, value: HabitForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const numeric = form.type === 'numeric';

  const submit = () => {
    if (!fields) {
      setShowErrors(true);
      const first = FIELD_ORDER.find((f) => errors[f]);
      // The `times` error belongs to whichever count box (week or month) is selected.
      const inputName =
        first === 'times' ? (form.freqKind === 'timesPerWeek' ? 'weekTimes' : 'monthTimes') : first;
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>(`[name="${inputName}"]`)?.focus(),
      );
      return;
    }
    if (habit) {
      updateHabit(habit.id, fields);
      goBack();
    } else {
      createHabit({ ...fields, archived: false });
      navigate('/', { replace: true });
    }
  };

  return (
    <>
      <AppBar
        title={habit ? 'Edit habit' : numeric ? 'New measurable habit' : 'New yes/no habit'}
        backTo={habit ? `/habit/${habit.id}` : '/'}
        actions={
          <button
            type="button"
            onClick={submit}
            className="min-h-11 rounded-full px-4 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Save
          </button>
        }
      />
      <main className="mx-auto max-w-[720px] px-4 pt-2 pb-24">
        <form
          ref={formRef}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <section className="card space-y-4 p-4">
            <TextField
              name="name"
              label="Name"
              value={form.name}
              onChange={(v) => set('name', v)}
              placeholder={numeric ? 'e.g. Run' : 'e.g. Exercise'}
              maxLength={LIMITS.name}
              error={visibleErrors.name}
              autoFocus={!habit}
            />
            <TextField
              name="question"
              label="Question (optional)"
              value={form.question}
              onChange={(v) => set('question', v)}
              placeholder={
                numeric ? 'e.g. How many km did you run today?' : 'e.g. Did you exercise today?'
              }
              maxLength={LIMITS.question}
              error={visibleErrors.question}
            />
            {habit && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Type: <strong>{numeric ? 'Measurable' : 'Yes or No'}</strong> (can’t be changed)
              </p>
            )}
          </section>

          <section className="card p-4">
            <ColorPicker value={form.color} onChange={(c) => set('color', c)} />
          </section>

          <section className="card p-4">
            <FrequencyPicker form={form} set={set} errors={visibleErrors} />
          </section>

          {numeric && (
            <section className="card space-y-4 p-4">
              <TextField
                name="unit"
                label="Unit (optional)"
                value={form.unit}
                onChange={(v) => set('unit', v)}
                placeholder="e.g. km, pages, min"
                maxLength={LIMITS.unit}
                error={visibleErrors.unit}
              />
              <TargetField form={form} set={set} error={visibleErrors.target} />
            </section>
          )}

          <section className="card space-y-4 p-4">
            <Field label="Start date" error={visibleErrors.startDate}>
              {(id, describedBy) => (
                <input
                  id={id}
                  name="startDate"
                  type="date"
                  max={today}
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  aria-describedby={describedBy}
                  aria-invalid={!!visibleErrors.startDate}
                  className="input"
                />
              )}
            </Field>
            <p className="-mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              The score starts counting from this day. Pick an earlier date to log past days.
            </p>
            <Field label="Notes (optional)" error={visibleErrors.description}>
              {(id, describedBy) => (
                <textarea
                  id={id}
                  name="description"
                  rows={3}
                  maxLength={LIMITS.description}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  aria-describedby={describedBy}
                  className="input h-auto resize-y py-2"
                />
              )}
            </Field>
          </section>

          <button
            type="submit"
            className="min-h-12 w-full rounded-full bg-neutral-900 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {habit ? 'Save changes' : 'Create habit'}
          </button>
        </form>

        {habit && (
          <section className="card mt-8 divide-y divide-neutral-100 dark:divide-neutral-800">
            <button
              type="button"
              onClick={() => {
                updateHabit(habit.id, { archived: !habit.archived });
                if (!habit.archived) navigate('/', { replace: true });
              }}
              className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <ArchiveIcon size={20} />
              <span>
                {habit.archived ? 'Unarchive habit' : 'Archive habit'}
                <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                  {habit.archived
                    ? 'Show it on the main screen again.'
                    : 'Hide it from the main screen. History is kept.'}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <TrashIcon size={20} />
              <span>
                Delete habit
                <span className="block text-sm opacity-80">
                  Removes the habit and all its history.
                </span>
              </span>
            </button>
          </section>
        )}
      </main>

      {confirmDelete && habit && (
        <ConfirmDialog
          title={`Delete “${habit.name}”?`}
          message="This removes the habit and all its history from every device. It can’t be undone. (Archiving keeps the history.)"
          confirmLabel="Delete"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            navigate('/', { replace: true });
            deleteHabit(habit.id);
          }}
        />
      )}
    </>
  );
}

/* ---------- Field components ---------- */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children(id, error ? errId : undefined)}
      {error && (
        <p id={errId} className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function TextField(props: {
  name: FormField;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <Field label={props.label} error={props.error}>
      {(id, describedBy) => (
        <input
          id={id}
          name={props.name}
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          maxLength={props.maxLength}
          autoFocus={props.autoFocus}
          autoComplete="off"
          aria-invalid={!!props.error}
          aria-describedby={describedBy}
          className="input"
        />
      )}
    </Field>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Colour</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
        {PALETTE.map((c) => {
          const selected = c.value.toLowerCase() === value.toLowerCase();
          return (
            <label
              key={c.value}
              className="relative flex h-11 cursor-pointer items-center justify-center"
            >
              <input
                type="radio"
                name="color"
                value={c.value}
                checked={selected}
                onChange={() => onChange(c.value)}
                className="peer sr-only"
              />
              <span className="sr-only">{c.name}</span>
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-white peer-checked:ring-2 peer-checked:ring-neutral-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-neutral-500 dark:ring-offset-neutral-900 dark:peer-checked:ring-neutral-100"
                style={{ backgroundColor: c.value }}
              >
                {selected && <CheckIcon size={20} />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type Setter = <K extends keyof HabitForm>(key: K, value: HabitForm[K]) => void;

function FrequencyPicker({
  form,
  set,
  errors,
}: {
  form: HabitForm;
  set: Setter;
  errors: FormErrors;
}) {
  const numeric = form.type === 'numeric';
  const groupName = useId();

  const smallNumber = (
    field: 'weekTimes' | 'monthTimes' | 'n',
    kind: Frequency['kind'],
    label: string,
  ) => (
    <input
      name={field}
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={form[field]}
      onFocus={() => set('freqKind', kind)}
      onChange={(e) => set(field, e.target.value)}
      aria-invalid={form.freqKind === kind && !!errors[field === 'n' ? 'n' : 'times']}
      className="input mx-1 inline-block h-10 w-14 px-1 text-center"
    />
  );

  const options: { kind: Frequency['kind']; label: ReactNode; text: string }[] = numeric
    ? [
        { kind: 'daily', label: 'Per day', text: 'Per day' },
        { kind: 'timesPerWeek', label: 'Per week', text: 'Per week' },
        { kind: 'timesPerMonth', label: 'Per month', text: 'Per month' },
        {
          kind: 'everyNDays',
          label: <>Every {smallNumber('n', 'everyNDays', 'Number of days')} days</>,
          text: 'Every N days',
        },
      ]
    : [
        { kind: 'daily', label: 'Every day', text: 'Every day' },
        {
          kind: 'timesPerWeek',
          label: (
            <>
              {smallNumber('weekTimes', 'timesPerWeek', 'Number of times per week')} times per week
            </>
          ),
          text: 'Times per week',
        },
        {
          kind: 'timesPerMonth',
          label: (
            <>
              {smallNumber('monthTimes', 'timesPerMonth', 'Number of times per month')} times per
              month
            </>
          ),
          text: 'Times per month',
        },
        {
          kind: 'everyNDays',
          label: <>Every {smallNumber('n', 'everyNDays', 'Number of days')} days</>,
          text: 'Every N days',
        },
      ];

  const err =
    (form.freqKind === 'everyNDays' && errors.n) ||
    ((form.freqKind === 'timesPerWeek' || form.freqKind === 'timesPerMonth') && errors.times);

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">
        {numeric ? 'Target period' : 'How often'}
      </legend>
      {options.map((o) => (
        <div key={o.kind} className="flex min-h-12 items-center gap-3">
          <input
            id={`${groupName}-${o.kind}`}
            type="radio"
            name={groupName}
            checked={form.freqKind === o.kind}
            onChange={() => set('freqKind', o.kind)}
            aria-label={o.text}
            className="h-5 w-5 shrink-0 accent-neutral-900 dark:accent-neutral-100"
          />
          <label htmlFor={`${groupName}-${o.kind}`} className="flex items-center">
            {o.label}
          </label>
        </div>
      ))}
      {err && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{err}</p>}
      {!numeric && form.freqKind !== 'daily' && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Days in between are ticked automatically once you hit the target.
        </p>
      )}
    </fieldset>
  );
}

function periodWord(form: HabitForm): string {
  switch (form.freqKind) {
    case 'daily':
      return 'per day';
    case 'timesPerWeek':
      return 'per week';
    case 'timesPerMonth':
      return 'per month';
    case 'everyNDays':
      return `every ${form.n.trim() || 'N'} days`;
  }
}

function TargetField({ form, set, error }: { form: HabitForm; set: Setter; error?: string }) {
  const id = useId();
  const seg = (value: HabitForm['targetType'], label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={form.targetType === value}
      onClick={() => set('targetType', value)}
      className={`min-h-10 flex-1 rounded-full px-3 text-sm font-medium ${form.targetType === value ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300'}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <p id={`${id}-label`} className="mb-1 text-sm font-medium">
        Target
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="mb-2 flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800"
      >
        {seg('atLeast', 'At least')}
        {seg('atMost', 'At most')}
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          name="target"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Target amount"
          aria-invalid={!!error}
          value={form.target}
          onChange={(e) => set('target', e.target.value)}
          placeholder="e.g. 5"
          className="input w-28 text-center"
        />
        <span className="text-neutral-600 dark:text-neutral-300">
          {form.unit.trim() || 'units'} {periodWord(form)}
        </span>
      </div>
      {error && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
