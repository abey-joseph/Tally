/**
 * A small, short confetti burst from a point on screen (~0.9s, 18 pieces).
 * Plain DOM + Web Animations API: no library. Skipped for "reduce motion" users.
 */
const COLORS = ['#e65100', '#c17d00', '#388e3c', '#1976d2', '#8e24aa', '#d81b60'];

export function confettiBurst(origin: Element | null, color?: string): void {
  if (!origin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = origin.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.confetti = '';
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden';
  document.body.appendChild(layer);

  const palette = color ? [color, color, ...COLORS] : COLORS;
  const animations: Animation[] = [];
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement('span');
    const size = 5 + Math.random() * 4;
    piece.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size * 0.6}px;border-radius:1px;background:${palette[i % palette.length]}`;
    layer.appendChild(piece);
    const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
    const dist = 40 + Math.random() * 50;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 30;
    animations.push(
      piece.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 360}deg)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(${dx * 1.15}px,${dy + 60}px) rotate(${Math.random() * 720}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 850 + Math.random() * 250,
          easing: 'cubic-bezier(.2,.7,.4,1)',
          fill: 'forwards',
        },
      ),
    );
  }
  Promise.all(animations.map((a) => a.finished))
    .catch(() => undefined)
    .finally(() => layer.remove());
}
