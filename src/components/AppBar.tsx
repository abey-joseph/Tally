import type { ReactNode } from 'react';
import { BackIcon } from './icons';
import { useDocumentTitle } from './useDocumentTitle';
import { useGoBack } from './useGoBack';

interface AppBarProps {
  title: ReactNode;
  /** Where "back" goes if there is no in-app history (e.g. opened from a link). */
  backTo?: string;
  actions?: ReactNode;
}

/** Sticky top bar with a back button, title and optional actions. */
export default function AppBar({ title, backTo = '/', actions }: AppBarProps) {
  const goBack = useGoBack(backTo);
  useDocumentTitle(typeof title === 'string' ? title : undefined);
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur dark:bg-neutral-900/95 [html.black_&]:bg-black/95">
      <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-1 px-2">
        <button type="button" aria-label="Back" onClick={goBack} className="icon-btn">
          <BackIcon size={24} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{title}</h1>
        {actions}
      </div>
    </header>
  );
}
