import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface MenuProps<T extends string> {
  label: string;
  icon: ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Extra plain actions shown under the choices (e.g. "Reorder…"). */
  actions?: { label: string; onSelect: () => void }[];
}

/** Small single-choice dropdown menu (used for sorting). */
export default function Menu<T extends string>({
  label,
  icon,
  value,
  options,
  onChange,
  actions,
}: MenuProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="icon-btn"
      >
        {icon}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center justify-between px-4 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              {o.label}
              {o.value === value && <span aria-hidden>✓</span>}
            </button>
          ))}
          {actions?.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={() => {
                a.onSelect();
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center border-t border-neutral-200 px-4 text-left text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
