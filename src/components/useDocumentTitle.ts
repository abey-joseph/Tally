import { useEffect } from 'react';

/** Sets the browser/tab title, e.g. "Run · Tally". */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Tally` : 'Tally';
  }, [title]);
}
