/** Synora's four-point spark. Matches src/assets/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <path
        d="M256 32 C 276 176 336 236 480 256 C 336 276 276 336 256 480 C 236 336 176 276 32 256 C 176 236 236 176 256 32 Z"
        fill="var(--color-accent)"
      />
      <circle cx="256" cy="256" r="44" fill="var(--color-bg)" />
    </svg>
  );
}
