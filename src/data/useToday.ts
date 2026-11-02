import { useEffect, useState } from 'react';
import { todayIn } from '../lib/dates';
import type { DateStr } from '../lib/types';

/**
 * Today's date in `timezone`, re-checked every minute and whenever the app
 * comes back to the foreground, so the day rolls over at local midnight.
 */
export function useToday(timezone: string): DateStr {
  const [today, setToday] = useState(() => todayIn(timezone));
  useEffect(() => {
    const check = () => setToday(todayIn(timezone));
    check();
    const id = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [timezone]);
  return today;
}
