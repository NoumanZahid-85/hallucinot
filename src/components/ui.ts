import type { Verdict } from "@/lib/types";

export const VERDICT_STYLE: Record<Verdict, { text: string; mark: string; dot: string; color: string }> = {
  supported: { text: "text-backed", mark: "mark mark-backed", dot: "bg-backed", color: "var(--backed)" },
  contradicted: { text: "text-refuted", mark: "mark mark-refuted", dot: "bg-refuted", color: "var(--refuted)" },
  unsupported: { text: "text-unsourced", mark: "mark mark-unsourced", dot: "bg-unsourced", color: "var(--unsourced)" },
  not_claim: { text: "text-filler", mark: "mark-filler", dot: "bg-filler", color: "var(--filler)" },
};

export const pct = (p: number) => `${Math.round(p * 100)}%`;

export const tokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

export const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toPrecision(2)}` : `$${n.toFixed(2)}`);

export const seconds = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`);

export function cellColor(sup: number, con: number) {
  return con > sup
    ? `color-mix(in oklab, var(--refuted) ${Math.round(con * 100)}%, var(--paper))`
    : `color-mix(in oklab, var(--backed) ${Math.round(sup * 100)}%, var(--paper))`;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
