interface ScoreRingProps {
  score: number; // 0–1
  /** Any CSS colour; defaults to the inherited text colour (e.g. `.habit-fg`). */
  color?: string;
  size?: number;
  strokeWidth?: number;
  /** Hide from screen readers when the score is already described in nearby text. */
  decorative?: boolean;
}

/** Small ring filled clockwise from 12 o'clock to the score. */
export default function ScoreRing({
  score,
  color = 'currentColor',
  size = 28,
  strokeWidth = 4,
  decorative = false,
}: ScoreRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Score ${Math.round(pct * 100)}%`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity={0.2}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap={pct > 0 && pct < 1 ? 'round' : 'butt'}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
