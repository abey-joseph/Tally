/**
 * Fixed palette of habit colours. Each has ≥ 3:1 contrast on white; in dark mode the UI
 * lightens them (see `.habit-fg` in index.css), giving ≥ 5:1 on near-black and black.
 */
export const PALETTE = [
  { name: 'Red', value: '#d32f2f' },
  { name: 'Deep orange', value: '#e64a19' },
  { name: 'Orange', value: '#e65100' },
  { name: 'Amber', value: '#c17d00' },
  { name: 'Olive', value: '#827717' },
  { name: 'Light green', value: '#5f9230' },
  { name: 'Green', value: '#388e3c' },
  { name: 'Emerald', value: '#1f7a5c' },
  { name: 'Teal', value: '#00897b' },
  { name: 'Cyan', value: '#0097a7' },
  { name: 'Light blue', value: '#0288d1' },
  { name: 'Blue', value: '#1976d2' },
  { name: 'Indigo', value: '#3949ab' },
  { name: 'Deep purple', value: '#5e35b1' },
  { name: 'Purple', value: '#8e24aa' },
  { name: 'Pink', value: '#d81b60' },
  { name: 'Rose', value: '#c2185b' },
  { name: 'Brown', value: '#6d4c41' },
  { name: 'Blue grey', value: '#546e7a' },
  { name: 'Grey', value: '#757575' },
] as const;

export const DEFAULT_COLOR = '#1f7a5c';

/** Position in the palette (for "sort by colour"); unknown colours go last. */
export function colorIndex(color: string): number {
  const i = PALETTE.findIndex((c) => c.value.toLowerCase() === color.toLowerCase());
  return i === -1 ? PALETTE.length : i;
}
