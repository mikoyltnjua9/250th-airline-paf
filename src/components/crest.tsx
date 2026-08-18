/**
 * Placeholder unit crest — a generic navy/gold roundel with a star.
 * Swap for the official 250th PAW crest once brand files are provided;
 * this component is the only place that needs to change.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="250th Presidential Airlift Wing crest (placeholder)"
    >
      <circle cx="32" cy="32" r="30" fill="var(--navy)" stroke="var(--gold)" strokeWidth="3" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <path
        d="M32 14l4.9 10.1 11.1 1.5-8 7.9 1.9 11.1L32 39.4l-9.9 5.2 1.9-11.1-8-7.9 11.1-1.5z"
        fill="var(--gold)"
      />
    </svg>
  );
}
