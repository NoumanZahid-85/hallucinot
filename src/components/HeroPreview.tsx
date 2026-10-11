"use client";

import { useEffect, useState } from "react";
import type { CheckResult } from "@/lib/types";
import { judgeAll } from "@/lib/verdict";
import { evidenceColor, ORDER, prefersReducedMotion, VERDICT } from "./ui";

/** A real saved analysis, replayed once on load: marks sweep in, the score counts up, the grid fills. */
export function HeroPreview({ result }: { result: CheckResult }) {
  const judgements = judgeAll(result, 0.8);
  const claims = judgements.filter((j) => j.verdict !== "not_claim");
  const supported = claims.filter((j) => j.verdict === "supported").length;
  const score = Math.round((supported / claims.length) * 100);
  const [shown, setShown] = useState(0);
  const step = 380;

  useEffect(() => {
    if (prefersReducedMotion()) return setShown(score);
    let raf = 0;
    const start = performance.now() + 900;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1400));
      setShown(Math.round(score * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const count = (v: (typeof ORDER)[number]) => judgements.filter((j) => j.verdict === v).length;
  const n = result.passages.length;

  return (
    <figure className="relative rounded-2xl border border-border bg-surface shadow-[0_30px_80px_-40px_rgba(15,18,23,0.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-online" />
          <span className="text-[13px] font-medium">Support bot answer</span>
        </div>
        <span className="text-[12px] text-muted">
          {result.meta.questions} checks, {(result.meta.ms / 1000).toFixed(1)} s
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <p className="text-[14px] leading-[1.9]">
          {result.sentences.slice(1, 8).map((s, k) => {
            const i = k + 1;
            return (
              <span key={i}>
                <span className={`${VERDICT[judgements[i].verdict].mark} sweep`} style={{ animationDelay: `${600 + k * step}ms` }}>
                  {s.text}
                </span>{" "}
              </span>
            );
          })}
        </p>

        <div className="flex flex-col gap-4 sm:border-l sm:border-hairline sm:pl-5">
          <div>
            <p className="text-[12px] text-ink-2">Groundedness</p>
            <p className="text-4xl font-semibold tracking-tight">{shown}%</p>
            <div className="mt-2 flex h-2 gap-[2px]">
              {ORDER.map(
                (v) =>
                  count(v) > 0 && (
                    <span
                      key={v}
                      className="grow-x h-full first:rounded-l-[3px] last:rounded-r-[3px]"
                      style={{ flexGrow: count(v), background: VERDICT[v].color, animationDelay: "900ms" }}
                    />
                  ),
              )}
            </div>
            <div className="mt-2 space-y-1 text-[12px] text-ink-2">
              {ORDER.map((v) => {
                const V = VERDICT[v];
                return (
                  <p key={v} className="flex items-center gap-1.5">
                    <V.Icon className="size-3.5" />
                    <span className="flex-1">{V.label}</span>
                    <span className="font-medium tabular-nums text-ink">{count(v)}</span>
                  </p>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[12px] text-ink-2">Every sentence × passage</p>
            <div className="mt-1.5 grid w-max gap-[2px]" style={{ gridTemplateColumns: `repeat(${n}, 0.875rem)` }} aria-hidden>
              {result.cells.flatMap((row, si) =>
                row.map(([sup, con], p) => (
                  <span
                    key={`${si}-${p}`}
                    className="cell-in size-3.5 rounded-[2px]"
                    style={{ background: evidenceColor(sup, con), animationDelay: `${1100 + (si * n + p) * 12}ms`, opacity: judgements[si].verdict === "not_claim" ? 0.3 : 1 }}
                  />
                )),
              )}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        A saved analysis of a support chatbot answer: {supported} of {claims.length} claims are supported by the help-center sources.
      </figcaption>
    </figure>
  );
}
