import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Habit } from '../lib/types';
import { ArrowDownIcon, ArrowUpIcon, GripIcon } from './icons';

const ROW = 56; // px, matches h-14

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

interface Drag {
  id: string;
  pointerId: number;
  startY: number;
  startIndex: number;
  dy: number;
}

/**
 * Manual ordering: drag a row by its handle (the handle has touch-action: none, so
 * dragging never scrolls the page on iPhone), or use the up/down buttons.
 * Every drop is saved immediately.
 */
export default function ReorderList({
  habits,
  onSave,
}: {
  habits: Habit[];
  onSave: (orderedIds: string[]) => void;
}) {
  const [order, setOrder] = useState(() => habits.map((h) => h.id));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announce, setAnnounce] = useState('');
  const base = useRef<string[]>(order);
  const byId = new Map(habits.map((h) => [h.id, h]));
  // Habits added/removed elsewhere while reordering: keep known order, append new ones.
  const ids = [
    ...order.filter((id) => byId.has(id)),
    ...habits.map((h) => h.id).filter((id) => !order.includes(id)),
  ];

  const commit = (next: string[], message?: string) => {
    setOrder(next);
    onSave(next);
    if (message) setAnnounce(message);
  };

  const onDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    base.current = ids;
    setDrag({ id, pointerId: e.pointerId, startY: e.clientY, startIndex: ids.indexOf(id), dy: 0 });
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dy = e.clientY - drag.startY;
    const to = Math.max(
      0,
      Math.min(base.current.length - 1, drag.startIndex + Math.round(dy / ROW)),
    );
    setOrder(move(base.current, drag.startIndex, to));
    setDrag({ ...drag, dy });
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const name = byId.get(drag.id)?.name ?? '';
    const pos = ids.indexOf(drag.id) + 1;
    setDrag(null);
    if (pos - 1 !== drag.startIndex)
      commit(ids, `${name} moved to position ${pos} of ${ids.length}`);
  };

  const step = (id: string, delta: number) => {
    const from = ids.indexOf(id);
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    commit(
      move(ids, from, to),
      `${byId.get(id)?.name} moved to position ${to + 1} of ${ids.length}`,
    );
  };

  return (
    <>
      <p className="px-2 py-3 text-sm text-neutral-500 dark:text-neutral-400">
        Drag the handle, or use the arrows. Changes are saved straight away.
      </p>
      <ul aria-label="Reorder habits" className="relative">
        {ids.map((id, i) => {
          const h = byId.get(id)!;
          const dragging = drag?.id === id;
          const style: CSSProperties = { '--habit': h.color } as CSSProperties;
          if (dragging) {
            style.transform = `translateY(${drag.dy - (i - drag.startIndex) * ROW}px)`;
            style.zIndex = 10;
          }
          return (
            <li
              key={id}
              style={style}
              className={`flex h-14 items-center gap-1 rounded-xl bg-white px-1 dark:bg-neutral-900 [html.black_&]:bg-black ${dragging ? 'shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-700' : 'transition-transform'}`}
            >
              <button
                type="button"
                aria-label={`Drag to reorder ${h.name}`}
                onPointerDown={(e) => onDown(e, id)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-lg text-neutral-500 active:cursor-grabbing"
              >
                <GripIcon size={22} />
              </button>
              <span aria-hidden className="habit-bg h-3 w-3 shrink-0 rounded-full" />
              <span className="ml-2 min-w-0 flex-1 truncate">{h.name}</span>
              <button
                type="button"
                aria-label={`Move ${h.name} up`}
                disabled={i === 0}
                onClick={() => step(id, -1)}
                className="icon-btn disabled:opacity-30"
              >
                <ArrowUpIcon size={20} />
              </button>
              <button
                type="button"
                aria-label={`Move ${h.name} down`}
                disabled={i === ids.length - 1}
                onClick={() => step(id, 1)}
                className="icon-btn disabled:opacity-30"
              >
                <ArrowDownIcon size={20} />
              </button>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </>
  );
}
