import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import AppBar from '../components/AppBar';
import { Segmented } from '../components/detail/common';
import { MinusIcon, PlusIcon } from '../components/icons';
import { useData } from '../data/DataProvider';
import {
  buildBackup,
  exportFileName,
  importWrites,
  parseBackup,
  planImport,
  toCsv,
  type Backup,
  type ImportPlan,
} from '../lib/backup';
import { todayIn } from '../lib/dates';
import { saveTextFile } from '../lib/download';
import { formatNumber, longDate } from '../lib/format';
import type { ThemeSetting, Weekday } from '../lib/types';

export default function SettingsPage() {
  const { settings, updateSettings } = useData();
  const { state, signOut } = useAuth();

  return (
    <>
      <AppBar title="Settings" />
      <main className="mx-auto max-w-[720px] space-y-4 px-4 pt-1 pb-24">
        <Section title="Appearance">
          <Row label="Theme">
            <Segmented<ThemeSetting>
              label="Theme"
              value={settings.theme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              onChange={(theme) => updateSettings({ theme })}
            />
          </Row>
          <Toggle
            label="Pure black"
            hint="Use true black in dark mode (saves battery on OLED screens)."
            checked={settings.pureBlack}
            onChange={(pureBlack) => updateSettings({ pureBlack })}
          />
        </Section>

        <Section title="Main screen">
          <Row label="Days shown">
            <Stepper
              label="Days shown"
              value={settings.daysShown}
              min={1}
              max={14}
              onChange={(daysShown) => updateSettings({ daysShown })}
            />
          </Row>
          <Toggle
            label="Newest day first"
            hint="Show today in the leftmost column."
            checked={settings.newestFirst}
            onChange={(newestFirst) => updateSettings({ newestFirst })}
          />
          <Toggle
            label="Confetti"
            hint="A small celebration when you tick a habit for today."
            checked={settings.confetti}
            onChange={(confetti) => updateSettings({ confetti })}
          />
        </Section>

        <Section title="Dates">
          <Row label="Week starts on">
            <Segmented<string>
              label="Week starts on"
              value={String(settings.weekStart)}
              options={[
                { value: '1', label: 'Mon' },
                { value: '0', label: 'Sun' },
                { value: '6', label: 'Sat' },
              ]}
              onChange={(v) => updateSettings({ weekStart: Number(v) as Weekday })}
            />
          </Row>
          <TimeZoneRow
            value={settings.timezone}
            onChange={(timezone) => updateSettings({ timezone })}
          />
        </Section>

        <DataSection />

        <Section title="Account">
          {state.status === 'signedIn' && (
            <p className="py-2 text-sm text-neutral-600 dark:text-neutral-300">
              Signed in as <strong>{state.user.email}</strong>
            </p>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="my-2 min-h-11 rounded-full border border-neutral-300 px-5 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </Section>
      </main>
    </>
  );
}

/* ---------- building blocks ---------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="card px-4 py-2">
      <h2
        id={id}
        className="pt-2 pb-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400"
      >
        {title}
      </h2>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
      <div>
        <div>{label}</div>
        {hint && <div className="text-sm text-neutral-500 dark:text-neutral-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle(props: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <div>{props.label}</div>
        {props.hint && (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">{props.hint}</div>
        )}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={`relative h-8 w-13 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 ${props.checked ? 'bg-emerald-700' : 'bg-neutral-300 dark:bg-neutral-600'}`}
      >
        <span
          aria-hidden
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${props.checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

function Stepper(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 disabled:opacity-40 dark:bg-neutral-800';
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Fewer ${props.label.toLowerCase()}`}
        disabled={props.value <= props.min}
        onClick={() => props.onChange(props.value - 1)}
        className={btn}
      >
        <MinusIcon size={18} />
      </button>
      <output
        aria-live="polite"
        aria-label={props.label}
        className="w-8 text-center text-lg font-semibold tabular-nums"
      >
        {props.value}
      </output>
      <button
        type="button"
        aria-label={`More ${props.label.toLowerCase()}`}
        disabled={props.value >= props.max}
        onClick={() => props.onChange(props.value + 1)}
        className={btn}
      >
        <PlusIcon size={18} />
      </button>
    </div>
  );
}

function TimeZoneRow({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const id = useId();
  const zones = useMemo(() => {
    let list: string[] = [];
    try {
      list = Intl.supportedValuesOf('timeZone');
    } catch {
      /* very old browser */
    }
    return list.includes(value) ? list : [value, ...list];
  }, [value]);
  return (
    <div className="py-3">
      <label htmlFor={id} className="mb-1 block">
        Time zone
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Days roll over at midnight here. Today is {longDate(todayIn(value))}.
      </p>
    </div>
  );
}

/* ---------- Export / import ---------- */

type ImportState =
  | { step: 'idle' }
  | { step: 'error'; message: string }
  | { step: 'preview'; fileName: string; backup: Backup; skippedHabits: number }
  | { step: 'done'; message: string };

function DataSection() {
  const { settings, habits, entriesFor, today, importData } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imp, setImp] = useState<ImportState>({ step: 'idle' });
  const [overwrite, setOverwrite] = useState(false);
  const [restoreSettings, setRestoreSettings] = useState(false);

  const exportCsv = () =>
    void saveTextFile(exportFileName('csv', today), toCsv(habits, entriesFor), 'text/csv');
  const exportJson = () =>
    void saveTextFile(
      exportFileName('json', today),
      JSON.stringify(buildBackup(settings, habits, entriesFor, new Date().toISOString()), null, 2),
      'application/json',
    );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setImp({ step: 'error', message: parsed.error });
      return;
    }
    setOverwrite(false);
    setRestoreSettings(false);
    setImp({
      step: 'preview',
      fileName: file.name,
      backup: parsed.backup,
      skippedHabits: parsed.skippedHabits,
    });
  };

  const runImport = async () => {
    if (imp.step !== 'preview') return;
    const w = importWrites(imp.backup, habits, entriesFor, { overwrite, restoreSettings });
    const entries = w.entryDocs.reduce(
      (n, d) => n + Object.keys(d.values).length + Object.keys(d.notes).length,
      0,
    );
    await importData(w);
    setImp({
      step: 'done',
      message: `Imported ${w.habits.length} ${w.habits.length === 1 ? 'habit' : 'habits'} and ${formatNumber(entries)} ${entries === 1 ? 'entry' : 'entries'}${w.settings ? ', and restored settings' : ''}.`,
    });
  };

  const actionBtn =
    'min-h-11 rounded-full border border-neutral-300 px-4 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800';

  return (
    <Section title="Your data">
      <div className="py-3">
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Export a spreadsheet (CSV: date, habit, value, note) or a full backup (JSON) you can
          import later.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className={actionBtn}>
            Export CSV
          </button>
          <button type="button" onClick={exportJson} className={actionBtn}>
            Export backup (JSON)
          </button>
        </div>
      </div>

      <div className="py-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className={actionBtn}>
          Import backup…
        </button>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          You’ll see what will change before anything is saved.
        </p>

        <div aria-live="polite">
          {imp.step === 'error' && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
              {imp.message}
            </p>
          )}
          {imp.step === 'done' && <p className="mt-3 text-sm font-medium">✓ {imp.message}</p>}
          {imp.step === 'preview' && (
            <ImportPreview
              state={imp}
              // Recomputed on every render, so it stays accurate if data syncs in meanwhile.
              plan={planImport(imp.backup, habits, entriesFor)}
              overwrite={overwrite}
              setOverwrite={setOverwrite}
              restoreSettings={restoreSettings}
              setRestoreSettings={setRestoreSettings}
              onCancel={() => setImp({ step: 'idle' })}
              onImport={() => void runImport()}
            />
          )}
        </div>
      </div>
    </Section>
  );
}

function ImportPreview(props: {
  state: Extract<ImportState, { step: 'preview' }>;
  plan: ImportPlan;
  overwrite: boolean;
  setOverwrite: (v: boolean) => void;
  restoreSettings: boolean;
  setRestoreSettings: (v: boolean) => void;
  onCancel: () => void;
  onImport: () => void;
}) {
  const { fileName, backup, skippedHabits } = props.state;
  const { plan } = props;
  const n = (x: number) => formatNumber(x);
  const replaceable = plan.conflicts + plan.changedHabits;
  const nothingToDo =
    plan.newHabits + plan.newEntries === 0 &&
    (!props.overwrite || replaceable === 0) &&
    !props.restoreSettings;
  return (
    <div className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-800">
      <h3 className="mb-2 font-semibold">Preview: {fileName}</h3>
      {backup.exportedAt && (
        <p className="mb-2 text-neutral-500 dark:text-neutral-400">
          Backup from {backup.exportedAt.slice(0, 10)} · {backup.habits.length} habits
        </p>
      )}
      <ul className="mb-3 list-disc space-y-1 pl-5">
        <li>{n(plan.newHabits)} new habits will be added</li>
        <li>{n(plan.newEntries)} new day entries and notes will be added</li>
        <li>{n(plan.sameEntries + plan.unchangedHabits)} items are already identical (skipped)</li>
        {replaceable > 0 && (
          <li>
            <strong>
              {n(plan.conflicts)} entries and {n(plan.changedHabits)} habits differ
            </strong>{' '}
            from what you have now — kept as they are unless you tick below
          </li>
        )}
        {skippedHabits > 0 && (
          <li>{n(skippedHabits)} invalid habits in the file will be ignored</li>
        )}
      </ul>
      {replaceable > 0 && (
        <label className="mb-2 flex items-start gap-2">
          <input
            type="checkbox"
            checked={props.overwrite}
            onChange={(e) => props.setOverwrite(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-red-700"
          />
          <span>Replace my current data with the backup’s version where they differ</span>
        </label>
      )}
      <label className="mb-4 flex items-start gap-2">
        <input
          type="checkbox"
          checked={props.restoreSettings}
          onChange={(e) => props.setRestoreSettings(e.target.checked)}
          className="mt-0.5 h-5 w-5"
        />
        <span>Also restore settings (theme, week start, time zone…)</span>
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="min-h-11 rounded-full px-4 font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={nothingToDo}
          onClick={props.onImport}
          className="min-h-11 rounded-full bg-neutral-900 px-5 font-semibold text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Import
        </button>
      </div>
    </div>
  );
}
