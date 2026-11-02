import { Link } from 'react-router-dom';
import AppBar from '../components/AppBar';

export default function NotFoundPage() {
  return (
    <>
      <AppBar title="Not found" />
      <main className="mx-auto max-w-[720px] px-4 py-16 text-center text-neutral-500 dark:text-neutral-400">
        <p className="mb-6">This page doesn’t exist.</p>
        <Link to="/" className="font-semibold text-neutral-900 underline dark:text-neutral-100">
          Back to habits
        </Link>
      </main>
    </>
  );
}
