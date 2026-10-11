"use client";

import type { CheckResult } from "@/lib/types";
import type { Judgement } from "@/lib/verdict";
import { evidenceColor, pct, VERDICT } from "../ui";
import { TipRow, useTooltip } from "./Tooltip";

interface Props {
  result: CheckResult;
  judgements: Judgement[];
  selected: number;
  onSelect: (s: number) => void;
  hovered: number | null;
  onHover: (p: number | null) => void;
}

/** Heatmap of every sentence × passage question, on a diverging red ← grey → blue scale. */
export function EvidenceMatrix({ result, judgements, selected, onSelect, hovered, onHover }: Props) {
  const tip = useTooltip();
  const n = result.passages.length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-2">
        <span>Contradicts</span>
        <span
          className="h-2.5 w-40 rounded-full"
          style={{ background: "linear-gradient(90deg, var(--refuted), var(--neutral) 50%, var(--supported))" }}
          aria-hidden
        />
        <span>Supports</span>
        <span className="text-muted">Grey means the passage says nothing about the sentence.</span>
      </div>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `3.5rem repeat(${n}, minmax(2.25rem, 1fr))`, minWidth: `${3.5 + n * 2.4}rem` }}>
            <div />
            {result.passages.map((p) => (
              <div key={p.i} className={`pb-1.5 text-center text-[11px] tabular-nums ${hovered === p.i ? "font-semibold text-ink" : "text-muted"}`} title={p.doc}>
                P{p.i + 1}
              </div>
            ))}
            {result.sentences.map((_, si) => {
              const v = VERDICT[judgements[si].verdict];
              return (
                <div key={si} className="contents">
                  <button
                    onClick={() => onSelect(si)}
                    className={`flex items-center gap-1.5 pr-2 text-[11px] tabular-nums ${si === selected ? "font-semibold text-ink" : "text-muted"}`}
                    aria-label={`Select sentence ${si + 1}`}
                  >
                    <v.Icon className="size-3.5" />S{si + 1}
                  </button>
                  {result.cells[si].map(([sup, con, none], p) => {
                    const content = (
                      <>
                        <p className="mb-1 font-medium">
                          S{si + 1} and P{p + 1}
                        </p>
                        <TipRow color="var(--supported)" value={pct(sup)} label="supports" />
                        <TipRow color="var(--refuted)" value={pct(con)} label="contradicts" />
                        <TipRow color="var(--muted)" value={pct(none)} label="says nothing" />
                      </>
                    );
                    return (
                      <button
                        key={p}
                        onClick={() => onSelect(si)}
                        onPointerMove={(e) => {
                          onHover(p);
                          tip.show(e, content);
                        }}
                        onPointerLeave={() => {
                          onHover(null);
                          tip.hide();
                        }}
                        onFocus={(e) => tip.show(e, content)}
                        onBlur={tip.hide}
                        aria-label={`Sentence ${si + 1}, passage ${p + 1}: supports ${pct(sup)}, contradicts ${pct(con)}`}
                        className={`cell-in h-8 rounded-[3px] transition-[filter] hover:brightness-110 ${
                          si === selected ? "ring-2 ring-ink ring-inset" : ""
                        } ${judgements[si].verdict === "not_claim" ? "opacity-30" : ""}`}
                        style={{ background: evidenceColor(sup, con), animationDelay: `${(si * n + p) * 4}ms` }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <Summary result={result} judgements={judgements} />
      </div>
      {tip.node}
    </div>
  );
}

function Summary({ result, judgements }: { result: CheckResult; judgements: Judgement[] }) {
  const cells = result.cells.flatMap((row, s) => (judgements[s].verdict === "not_claim" ? [] : row));
  const sup = cells.filter(([a, b]) => a >= 0.5 && a > b).length;
  const con = cells.filter(([a, b]) => b >= 0.5 && b > a).length;
  const rows = [
    { n: sup, label: "back a sentence", color: "var(--supported)" },
    { n: con, label: "contradict a sentence", color: "var(--refuted)" },
    { n: cells.length - sup - con, label: "say nothing about it", color: "var(--neutral)" },
  ];
  return (
    <aside className="shrink-0 rounded-lg bg-surface-2 p-4 lg:w-60">
      <p className="text-3xl font-semibold tracking-tight">{cells.length}</p>
      <p className="text-[13px] text-ink-2">checks on real claims, of which</p>
      <ul className="mt-3 space-y-2 text-[13px]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-[3px]" style={{ background: r.color }} />
            <span className="w-7 font-semibold tabular-nums">{r.n}</span>
            <span className="text-ink-2">{r.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-hairline pt-3 text-[12px] leading-relaxed text-muted">
        Most checks say nothing, which is expected: each passage covers only a few topics. Click any square to inspect that sentence.
      </p>
    </aside>
  );
}
