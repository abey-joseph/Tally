/**
 * Applies the theme to <html> (`dark` class, plus `black` for pure black) and keeps the
 * browser/status-bar colour in sync. The last choice is cached in localStorage so the
 * inline script in index.html can apply it before React loads (no white flash).
 */
import { useEffect } from 'react';
import type { ThemeSetting } from './lib/types';

const KEY = 'tally-theme';
const COLORS = { light: '#ffffff', dark: '#171717', black: '#000000' } as const;

function apply(theme: ThemeSetting, pureBlack: boolean) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('black', dark && pureBlack);
  root.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', dark ? (pureBlack ? COLORS.black : COLORS.dark) : COLORS.light);
}

export function useTheme(theme: ThemeSetting, pureBlack: boolean) {
  useEffect(() => {
    apply(theme, pureBlack);
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme, pureBlack }));
    } catch {
      /* storage unavailable (private mode) — fine */
    }
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply(theme, pureBlack);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, pureBlack]);
}
