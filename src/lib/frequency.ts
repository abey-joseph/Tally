import type { Frequency } from './types';

/** Every frequency expressed as "X times in a rolling window of N days". */
export interface FrequencyWindow {
  times: number; // X
  days: number; // N
}

const clampInt = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(v) ? v : min)));

export function toWindow(freq: Frequency): FrequencyWindow {
  switch (freq.kind) {
    case 'daily':
      return { times: 1, days: 1 };
    case 'timesPerWeek':
      return { times: clampInt(freq.times, 1, 7), days: 7 };
    case 'timesPerMonth':
      return { times: clampInt(freq.times, 1, 31), days: 30 };
    case 'everyNDays':
      return { times: 1, days: clampInt(freq.n, 1, 30) };
  }
}

/** X / N — the fraction of days the habit is expected on. */
export function frequencyRatio(freq: Frequency): number {
  const { times, days } = toWindow(freq);
  return Math.min(1, times / days);
}

const timesLabel = (n: number) => (n === 1 ? 'Once' : n === 2 ? 'Twice' : `${n} times`);

export function describeFrequency(freq: Frequency): string {
  switch (freq.kind) {
    case 'daily':
      return 'Every day';
    case 'timesPerWeek':
      return freq.times >= 7 ? 'Every day' : `${timesLabel(freq.times)} per week`;
    case 'timesPerMonth':
      return `${timesLabel(freq.times)} per month`;
    case 'everyNDays':
      return `Every ${freq.n} days`;
  }
}
