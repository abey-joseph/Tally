/**
 * Create/edit habit form: state shape, defaults, and validation.
 * Inputs are kept as strings while editing; `validateForm` turns them into habit fields.
 */
import { isValidDateStr } from './dates';
import { parseAmount } from './format';
import type { DateStr, Frequency, Habit, HabitType, TargetType } from './types';

export interface HabitForm {
  type: HabitType;
  name: string;
  question: string;
  description: string;
  color: string;
  freqKind: Frequency['kind'];
  /** X for "X times per week" / "X times per month" (Yes/No habits only). */
  weekTimes: string;
  monthTimes: string;
  /** N for "every N days". */
  n: string;
  unit: string;
  target: string;
  targetType: TargetType;
  startDate: string;
}

export type FormField =
  'name' | 'question' | 'description' | 'times' | 'n' | 'unit' | 'target' | 'startDate';
export type FormErrors = Partial<Record<FormField, string>>;

/** Everything about a habit that the form controls. Optional fields are explicitly `undefined` when empty. */
export type HabitFields = Omit<Habit, 'id' | 'order' | 'createdAt' | 'archived'>;

export const LIMITS = { name: 60, question: 120, description: 1000, unit: 15 } as const;

export function emptyForm(type: HabitType, today: DateStr, color: string): HabitForm {
  return {
    type,
    name: '',
    question: '',
    description: '',
    color,
    freqKind: 'daily',
    weekTimes: '3',
    monthTimes: '10',
    n: '2',
    unit: '',
    target: '',
    targetType: 'atLeast',
    startDate: today,
  };
}

export function formFromHabit(h: Habit): HabitForm {
  const f = h.frequency;
  return {
    type: h.type,
    name: h.name,
    question: h.question ?? '',
    description: h.description ?? '',
    color: h.color,
    freqKind: f.kind,
    weekTimes: f.kind === 'timesPerWeek' ? String(f.times) : '3',
    monthTimes: f.kind === 'timesPerMonth' ? String(f.times) : '10',
    n: f.kind === 'everyNDays' ? String(f.n) : '2',
    unit: h.unit ?? '',
    target: h.target !== undefined ? String(h.target) : '',
    targetType: h.targetType ?? 'atLeast',
    startDate: h.startDate,
  };
}

function intInRange(s: string, min: number, max: number): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}

/**
 * Measurable habits pick a *period* (day / week / month / every N days) rather than
 * "X times per week": the target is an amount per period, so a count of times would
 * have no meaning. Weekly/monthly are stored as 1× per week/month.
 */
function buildFrequency(f: HabitForm, errors: FormErrors): Frequency | null {
  switch (f.freqKind) {
    case 'daily':
      return { kind: 'daily' };
    case 'timesPerWeek':
    case 'timesPerMonth': {
      if (f.type === 'numeric') return { kind: f.freqKind, times: 1 };
      const weekly = f.freqKind === 'timesPerWeek';
      const max = weekly ? 7 : 31;
      const times = intInRange(weekly ? f.weekTimes : f.monthTimes, 1, max);
      if (times === null) {
        errors.times = `Enter a whole number from 1 to ${max}`;
        return null;
      }
      return { kind: f.freqKind, times };
    }
    case 'everyNDays': {
      const n = intInRange(f.n, 2, 30);
      if (n === null) {
        errors.n = 'Enter a whole number from 2 to 30';
        return null;
      }
      return { kind: 'everyNDays', n };
    }
  }
}

const opt = (s: string): string | undefined => s.trim() || undefined;

export function validateForm(
  f: HabitForm,
  today: DateStr,
): { errors: FormErrors; fields: HabitFields | null } {
  const errors: FormErrors = {};
  const name = f.name.trim();
  if (!name) errors.name = 'Give your habit a name';
  else if (name.length > LIMITS.name) errors.name = `Keep it under ${LIMITS.name} characters`;
  if (f.question.trim().length > LIMITS.question)
    errors.question = `Keep it under ${LIMITS.question} characters`;
  if (f.description.trim().length > LIMITS.description)
    errors.description = `Keep it under ${LIMITS.description} characters`;

  const frequency = buildFrequency(f, errors);

  let target: number | undefined;
  if (f.type === 'numeric') {
    if (f.unit.trim().length > LIMITS.unit) errors.unit = `Keep it under ${LIMITS.unit} characters`;
    const t = parseAmount(f.target);
    if (t === null) errors.target = 'Enter a number, e.g. 5 or 2.5';
    else if (t === 0 && f.targetType === 'atLeast') errors.target = 'Target must be more than 0';
    else target = t;
  }

  if (!isValidDateStr(f.startDate)) errors.startDate = 'Choose a valid date';
  else if (f.startDate > today) errors.startDate = 'Start date can’t be in the future';

  if (Object.keys(errors).length > 0 || !frequency) return { errors, fields: null };

  const numeric = f.type === 'numeric';
  return {
    errors,
    fields: {
      type: f.type,
      name,
      question: opt(f.question),
      description: opt(f.description),
      color: f.color,
      frequency,
      unit: numeric ? opt(f.unit) : undefined,
      target: numeric ? target : undefined,
      targetType: numeric ? f.targetType : undefined,
      startDate: f.startDate,
    },
  };
}

/** Suggests a colour not used yet (palette order), falling back to cycling. */
export function suggestColor(palette: readonly string[], used: string[]): string {
  const taken = new Set(used.map((c) => c.toLowerCase()));
  return palette.find((c) => !taken.has(c.toLowerCase())) ?? palette[used.length % palette.length]!;
}
