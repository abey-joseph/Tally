import { useData } from '../data/DataProvider';

/** Shows the last failed save (e.g. permission denied) until dismissed. */
export default function WriteErrorToast() {
  const { writeError, dismissWriteError } = useData();
  if (!writeError) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="alert"
        className="flex w-full max-w-md items-start gap-3 rounded-xl bg-neutral-900 p-4 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
      >
        <p className="flex-1">{writeError}</p>
        <button type="button" onClick={dismissWriteError} className="min-h-11 px-2 font-semibold">
          Dismiss
        </button>
      </div>
    </div>
  );
}
