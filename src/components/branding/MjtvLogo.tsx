type MjtvLogoProps = {
  className?: string;
  /** Kept for existing callers: the mark is inline SVG and needs no preloading. */
  priority?: boolean;
  variant: "horizontal" | "mark";
};

/** The M is two peaks; the sun sits between them and sets behind them at night (see ThemeBoot). */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <circle className="md-logo-sun" cx="24" cy="8" r="6.2" />
      <path
        fill="currentColor"
        d="M3 44V4h9.6L24 24.2 35.4 4H45v40h-9.4V23.4L24 43.2 12.4 23.4V44z"
      />
    </svg>
  );
}

export function MjtvLogo({ className, variant }: MjtvLogoProps) {
  if (variant === "mark") return <Mark className={className} />;
  return (
    <span className={`md-wordmark ${className ?? ""}`} aria-hidden>
      <Mark className="md-wordmark-mark" />
      <span>MJTV</span>
    </span>
  );
}
