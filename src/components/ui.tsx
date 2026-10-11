import type { Verdict } from "@/lib/types";
import { Alert, CheckCircle, MinusCircle, XCircle } from "./Icons";

/** Every verdict carries an icon and a label, never colour alone. */
export const VERDICT: Record<Verdict, { label: string; color: string; soft: string; mark: string; Icon: typeof CheckCircle; reason: string }> = {
  supported: {
    label: "Supported",
    color: "var(--supported)",
    soft: "var(--supported-soft)",
    mark: "mark mark-supported",
    Icon: CheckCircle,
    reason: "A source passage states this or directly implies it.",
  },
  contradicted: {
    label: "Contradicted",
    color: "var(--refuted)",
    soft: "var(--refuted-soft)",
    mark: "mark mark-refuted",
    Icon: XCircle,
    reason: "A source passage says the opposite. This is a hallucination.",
  },
  unsupported: {
    label: "No source",
    color: "var(--unsourced)",
    soft: "var(--unsourced-soft)",
    mark: "mark mark-unsourced",
    Icon: Alert,
    reason: "No passage backs this up or rules it out. It may be invented.",
  },
  not_claim: {
    label: "Not a claim",
    color: "var(--filler)",
    soft: "var(--neutral)",
    mark: "mark-filler",
    Icon: MinusCircle,
    reason: "A greeting or sign-off. There is nothing to check.",
  },
};

export const ORDER: Verdict[] = ["supported", "contradicted", "unsupported"];

export function VerdictBadge({ verdict, className = "" }: { verdict: Verdict; className?: string }) {
  const v = VERDICT[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <v.Icon className="size-4 shrink-0" />
      <span className="text-ink">{v.label}</span>
    </span>
  );
}

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

/** Diverging evidence scale: red (contradicts) ← neutral grey → blue (supports). */
export function evidenceColor(sup: number, con: number) {
  const d = sup - con;
  const pole = d >= 0 ? "var(--supported)" : "var(--refuted)";
  return `color-mix(in oklab, ${pole} ${Math.round(Math.abs(d) * 100)}%, var(--neutral))`;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
