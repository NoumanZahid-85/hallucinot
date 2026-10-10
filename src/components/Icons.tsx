// Small stroke icons, 24px grid. All decorative: callers label the control instead.
type P = { className?: string };
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const Headset = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
    <path d="M19 20a4 4 0 0 1-4 2h-2" />
  </svg>
);

export const Planet = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="5.5" />
    <path d="M3.5 15.5c-1.5-2.5 2.6-5.6 8.5-7.3s10.4-1.3 9.9 1.5c-.4 2.2-4.2 4.7-9.6 6.2S4.6 17.4 3.5 15.5Z" />
  </svg>
);

export const Briefcase = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="7" width="18" height="13" rx="2.5" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" />
  </svg>
);

export const Pencil = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

export const Flag = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M5 21V4m0 0h11l-2 4 2 4H5" />
  </svg>
);

export const Check = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Cross = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Question = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.1v.4" />
    <circle cx="12" cy="18" r="0.6" fill="currentColor" />
  </svg>
);

export const ArrowLeft = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ArrowRight = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const Copy = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);

export const Bolt = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
  </svg>
);

export const Sun = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);

export const Moon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

export const Scissors = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="6" cy="7" r="2.5" />
    <circle cx="6" cy="17" r="2.5" />
    <path d="M8 8.5 20 18M8 15.5 20 6" />
  </svg>
);

export const Grid = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="4" y="4" width="6" height="6" rx="1.2" />
    <rect x="14" y="4" width="6" height="6" rx="1.2" />
    <rect x="4" y="14" width="6" height="6" rx="1.2" />
    <rect x="14" y="14" width="6" height="6" rx="1.2" />
  </svg>
);

export const Gauge = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
    <path d="m12 13 4-4" />
  </svg>
);

export const Spinner = ({ className }: P) => (
  <svg {...base} className={`spin ${className ?? ""}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

export const Logo = ({ className }: P) => (
  <svg width="28" height="28" viewBox="0 0 28 28" className={className} aria-hidden>
    <rect width="28" height="28" rx="8" fill="var(--brand)" />
    <path d="M8 10.5h12" stroke="var(--brand-ink)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M8 17.5h7" stroke="var(--brand-ink)" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
    <path d="m17.5 15.5 4 4M21.5 15.5l-4 4" stroke="var(--brand-ink)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
