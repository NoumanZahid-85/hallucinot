import type { Verdict } from "@/lib/types";

export const VERDICT_STYLE: Record<Verdict, { text: string; mark: string; dot: string; soft: string; color: string }> = {
  supported: { text: "text-backed", mark: "mark mark-backed", dot: "bg-backed", soft: "bg-backed-hl", color: "var(--backed)" },
  contradicted: { text: "text-refuted", mark: "mark mark-refuted", dot: "bg-refuted", soft: "bg-refuted-hl", color: "var(--refuted)" },
  unsupported: { text: "text-unsourced", mark: "mark mark-unsourced", dot: "bg-unsourced", soft: "bg-unsourced-hl", color: "var(--unsourced)" },
  not_claim: { text: "text-filler", mark: "mark-filler", dot: "bg-filler", soft: "bg-line", color: "var(--filler)" },
};

/** One short reason per verdict, shown next to the selected sentence. */
export const VERDICT_REASON: Record<Verdict, string> = {
  supported: "Found in the sources",
  contradicted: "The sources say otherwise",
  unsupported: "Not in any source",
  not_claim: "Small talk, nothing to check",
};

const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumSignificantDigits: 2 });
const secs = new Intl.NumberFormat("en", { style: "unit", unit: "second", unitDisplay: "narrow", maximumFractionDigits: 1 });
// Fixed locale and time zone keep server and client output identical (no hydration mismatch).
const day = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export const pct = (p: number) => percent.format(p);
export const tokens = (n: number) => compact.format(n);
export const usd = (n: number) => money.format(n);
export const seconds = (ms: number) => secs.format(ms / 1000);
export const date = (iso: string) => day.format(new Date(iso));

export function cellColor(sup: number, con: number) {
  return con > sup
    ? `color-mix(in oklab, var(--refuted) ${Math.round(con * 100)}%, var(--bg))`
    : `color-mix(in oklab, var(--backed) ${Math.round(sup * 100)}%, var(--bg))`;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
