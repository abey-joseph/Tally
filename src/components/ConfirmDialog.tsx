import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus(); // safe default for destructive actions
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const btn =
    'min-h-11 rounded-full px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div aria-hidden className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800"
      >
        <h2 id={titleId} className="mb-2 text-lg font-semibold">
          {title}
        </h2>
        <p id={descId} className="mb-6 text-neutral-600 dark:text-neutral-300">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={`${btn} text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${btn} text-white ${destructive ? 'bg-red-700 hover:bg-red-800' : 'bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
