import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  children?: ReactNode;
}

/** Centred, mobile-first page container (max ~720px on laptop). */
export default function PageShell({ title, children }: PageShellProps) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4">
      <header className="flex h-14 items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
