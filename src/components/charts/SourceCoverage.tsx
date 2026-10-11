"use client";

import type { CheckResult } from "@/lib/types";
import type { Judgement } from "@/lib/verdict";
import { TipRow, useTooltip } from "./Tooltip";

interface Props {
  result: CheckResult;
  judgements: Judgement[];
  hovered: number | null;
  onHover: (p: number | null) => void;
}

/** Stacked bars per passage: how many claims it supports and how many it contradicts. */
export function SourceCoverage({ result, judgements, hovered, onHover }: Props) {
  const tip = useTooltip();
  const claims = judgements.flatMap((j, s) => (j.verdict === "not_claim" ? [] : [s]));
  const rows = result.passages.map((p) => {
    const sup = claims.filter((s) => result.cells[s][p.i][0] >= 0.5 && result.cells[s][p.i][0] > result.cells[s][p.i][1]);
    const con = claims.filter((s) => result.cells[s][p.i][1] >= 0.5 && result.cells[s][p.i][1] > result.cells[s][p.i][0]);
    return { p, sup, con };
  });
  const max = Math.max(1, ...rows.map((r) => r.sup.length + r.con.length));
  const unused = rows.filter((r) => r.sup.length + r.con.length === 0).length;
  const ticks = Array.from(new Set([0, Math.ceil(max / 2), max]));

  return (
    <div>
      <Legend />
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4">
        <div>
          {rows.map(({ p }) => (
            <div key={p.i} className={`flex h-9 min-w-0 items-center gap-2 text-[13px] ${hovered === p.i ? "font-medium text-ink" : "text-ink-2"}`}>
              <span className="w-6 shrink-0 tabular-nums text-muted">P{p.i + 1}</span>
              <span className="truncate">{p.doc}</span>
            </div>
          ))}
        </div>
        <div className="relative mr-6">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-y-0 w-px bg-hairline" style={{ left: `${(t / max) * 100}%` }} aria-hidden />
          ))}
          {rows.map(({ p, sup, con }) => {
            const total = sup.length + con.length;
            const content = (
              <>
                <p className="mb-1 font-medium">
                  P{p.i + 1}, {p.doc}
                </p>
                <TipRow color="var(--supported)" value={`${sup.length}`} label={`claims supported${sup.length ? ` (S${sup.map((s) => s + 1).join(", S")})` : ""}`} />
                <TipRow color="var(--refuted)" value={`${con.length}`} label={`claims contradicted${con.length ? ` (S${con.map((s) => s + 1).join(", S")})` : ""}`} />
              </>
            );
            return (
              <div
                key={p.i}
                tabIndex={0}
                role="img"
                aria-label={`Passage ${p.i + 1}, ${p.doc}: supports ${sup.length}, contradicts ${con.length}`}
                onPointerMove={(e) => {
                  onHover(p.i);
                  tip.show(e, content);
                }}
                onPointerLeave={() => {
                  onHover(null);
                  tip.hide();
                }}
                onFocus={(e) => {
                  onHover(p.i);
                  tip.show(e, content);
                }}
                onBlur={() => {
                  onHover(null);
                  tip.hide();
                }}
                className={`relative flex h-9 items-center rounded-sm ${hovered === p.i ? "bg-surface-2" : ""}`}
              >
                {total === 0 ? (
                  <span className="text-[12px] text-muted">Not used</span>
                ) : (
                  <>
                    <span className="grow-x flex h-3 gap-[2px]" style={{ width: `${(total / max) * 100}%` }}>
                      {sup.length > 0 && <span className="h-full rounded-r-[4px] bg-supported first:rounded-l-none" style={{ flexGrow: sup.length }} />}
                      {con.length > 0 && <span className="h-full rounded-r-[4px] bg-refuted" style={{ flexGrow: con.length }} />}
                    </span>
                    <span className="ml-2 text-[12px] tabular-nums text-ink-2">{total}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div />
        <div className="relative mr-6 mt-1 h-4 text-[11px] tabular-nums text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[13px] text-ink-2">
        {unused ? (
          <>
            <span className="font-medium text-ink">{unused}</span> of {rows.length} passages were never used to back or refute a claim.
          </>
        ) : (
          "Every passage was used at least once."
        )}
      </p>
      {tip.node}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-3 rounded-[2px] bg-supported" /> Claims supported
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-3 rounded-[2px] bg-refuted" /> Claims contradicted
      </span>
    </div>
  );
}
