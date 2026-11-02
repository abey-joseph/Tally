import { useEffect, useRef, useState } from 'react';

/** Width of an element, kept up to date with ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export const AXIS_TEXT = 'fill-neutral-500 dark:fill-neutral-400 text-[10px]';
export const GRID_LINE = 'stroke-neutral-200 dark:stroke-neutral-800';
