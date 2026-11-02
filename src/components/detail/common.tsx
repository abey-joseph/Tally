import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Horizontally scrollable area that starts scrolled to the newest data (the right). */
export function ScrollToEnd({
  children,
  resetKey,
  label,
}: {
  children: ReactNode;
  resetKey: unknown;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [resetKey]);
  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-neutral-500 [scrollbar-width:thin]"
    >
      {children}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = `card-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Small segmented control for zoom levels. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-800"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 min-w-9 rounded-full px-2.5 text-xs font-medium ${o.value === value ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
