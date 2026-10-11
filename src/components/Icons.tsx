// Stroke icons on a 24px grid. All decorative (aria-hidden): callers label the control.
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

export const CheckCircle = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.3 2.7 2.7L16 9.6" />
  </svg>
);

export const XCircle = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6m0-6-6 6" />
  </svg>
);

export const Alert = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4" />
    <circle cx="12" cy="16.8" r="0.5" fill="currentColor" />
  </svg>
);

export const MinusCircle = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12h7" />
  </svg>
);

export const Info = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="7.8" r="0.5" fill="currentColor" />
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

export const ChevronDown = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const Copy = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);

export const Download = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
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

export const Spinner = ({ className }: P) => (
  <svg {...base} className={`spin ${className ?? ""}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

export const Headset = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" />
  </svg>
);

export const Telescope = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="m4 13 13-6 2 4-13 6-2-4Z" />
    <path d="m10 15 2 6m0-6-2 6" />
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

export const Logo = ({ className }: P) => (
  <svg width="28" height="28" viewBox="0 0 28 28" className={className} aria-hidden>
    <rect width="28" height="28" rx="7" fill="var(--ink)" />
    <path d="M7 10h14" stroke="var(--supported)" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M7 18.5c1.2-1.6 2.3-1.6 3.5 0s2.3 1.6 3.5 0 2.3-1.6 3.5 0 2.3 1.6 3.5 0" stroke="var(--refuted)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
  </svg>
);
