import type { EntryValue } from './types';

/**
 * Next value when a Yes/No day box is tapped:
 * not entered / no → done → skipped → cleared.
 *
 * "Cleared" removes the entry rather than storing 'n', so the day shows as missed (✕) —
 * or as a faded auto-tick if the week's target is already met, or empty if it's today.
 * Storing an explicit 'n' would permanently block auto-ticks for that day.
 */
export function nextBooleanValue(current: EntryValue | undefined): EntryValue | null {
  if (current === 'y') return 's';
  if (current === 's') return null;
  return 'y';
}
