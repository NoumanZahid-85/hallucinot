import type { Verdict } from "@/lib/types";

export const VERDICT_STYLE: Record<Verdict, { text: string; soft: string; border: string; dot: string; color: string }> = {
  supported: { text: "text-ok", soft: "bg-ok-soft", border: "border-ok", dot: "bg-ok", color: "var(--ok)" },
  contradicted: { text: "text-bad", soft: "bg-bad-soft", border: "border-bad", dot: "bg-bad", color: "var(--bad)" },
  unsupported: { text: "text-warn", soft: "bg-warn-soft", border: "border-warn", dot: "bg-warn", color: "var(--warn)" },
  not_claim: { text: "text-idle", soft: "bg-idle-soft", border: "border-idle", dot: "bg-idle", color: "var(--idle)" },
};

export const pct = (p: number) => `${Math.round(p * 100)}%`;

export const tokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

export const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toPrecision(2)}` : `$${n.toFixed(2)}`);

export const seconds = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`);

export function cellColor(sup: number, con: number) {
  return con > sup
    ? `color-mix(in oklab, var(--bad) ${Math.round(con * 100)}%, var(--surface-2))`
    : `color-mix(in oklab, var(--ok) ${Math.round(sup * 100)}%, var(--surface-2))`;
}
