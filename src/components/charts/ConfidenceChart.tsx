"use client";

import { useRef } from "react";
import type { CheckResult } from "@/lib/types";
import type { Judgement } from "@/lib/verdict";
import { pct, VERDICT } from "../ui";
import { TipRow, useTooltip } from "./Tooltip";

const MIN = 0.5, MAX = 0.99;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));

interface Props {
  result: CheckResult;
  judgements: Judgement[];
  selected: number;
  onSelect: (s: number) => void;
  threshold: number;
  onThreshold: (v: number) => void;
}

/** Horizontal bars: how sure the engine is about each claim's verdict, with a draggable review line. */
export function ConfidenceChart({ result, judgements, selected, onSelect, threshold, onThreshold }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const tip = useTooltip();
  const rows = judgements.map((j, s) => ({ j, s })).filter(({ j }) => j.verdict !== "not_claim");
  const review = rows.filter(({ j }) => j.needsReview).length;

  const fromPointer = (clientX: number) => {
    const r = plotRef.current?.getBoundingClientRect();
    if (r) onThreshold(clamp((clientX - r.left) / r.width));
  };

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4">
        {/* Threshold readout aligned over the plot */}
        <div />
        <div className="relative mb-1 mr-10 h-6">
          <span
            className="absolute whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-medium text-page"
            style={{ left: `${threshold * 100}%`, transform: `translateX(${threshold > 0.85 ? "-100%" : "-50%"})` }}
          >
            Review below {pct(threshold)}
          </span>
        </div>

        {/* Row labels */}
        <div>
          {rows.map(({ s }) => (
            <div key={s} className={`flex h-9 min-w-0 items-center gap-2 text-[13px] ${s === selected ? "font-medium text-ink" : "text-ink-2"}`}>
              <span className="w-6 shrink-0 tabular-nums text-muted">S{s + 1}</span>
              <span className="truncate">{result.sentences[s].text}</span>
            </div>
          ))}
        </div>

        {/* Plot */}
        <div
          ref={plotRef}
          className="relative mr-10 cursor-ew-resize touch-none select-none"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e.clientX);
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e.clientX)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div key={t} className="absolute inset-y-0 w-px bg-hairline" style={{ left: `${t * 100}%` }} aria-hidden />
          ))}
          {rows.map(({ j, s }) => {
            const v = VERDICT[j.verdict];
            return (
              <button
                key={s}
                onClick={() => onSelect(s)}
                onPointerMove={(e) =>
                  tip.show(
                    e,
                    <>
                      <TipRow color={v.color} value={pct(j.confidence)} label={`sure it is ${v.label.toLowerCase()}`} />
                      <p className="mt-1 text-ink-2">S{s + 1}: {result.sentences[s].text}</p>
                      {j.needsReview && <p className="mt-1 font-medium">Below the review line, so a person should check it.</p>}
                    </>,
                  )
                }
                onPointerLeave={tip.hide}
                onFocus={(e) => tip.show(e, <TipRow color={v.color} value={pct(j.confidence)} label={`S${s + 1}, ${v.label}`} />)}
                onBlur={tip.hide}
                aria-label={`Sentence ${s + 1}: ${v.label}, ${pct(j.confidence)} confidence${j.needsReview ? ", needs review" : ""}`}
                aria-pressed={s === selected}
                className={`group relative flex h-9 w-full cursor-pointer items-center ${s === selected ? "bg-surface-2" : "hover:bg-surface-2/70"} rounded-sm`}
              >
                <span
                  className="grow-x h-3 rounded-r-[4px] transition-opacity"
                  style={{ width: `${j.confidence * 100}%`, background: v.color, opacity: j.needsReview ? 0.4 : 1 }}
                />
                <span className="ml-2 text-[12px] tabular-nums text-ink-2">
                  {pct(j.confidence)}
                  {j.needsReview && <span className="ml-1 font-medium text-ink">review</span>}
                </span>
              </button>
            );
          })}

          {/* Draggable review line */}
          {/* A 24px grab strip around the 2px line, so it can be dragged anywhere along its length */}
          <div className="absolute inset-y-0 z-10 flex w-6 -translate-x-1/2 cursor-ew-resize justify-center" style={{ left: `${threshold * 100}%` }} aria-hidden>
            <div className="h-full w-0.5 bg-ink" />
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Review threshold"
            aria-valuemin={MIN * 100}
            aria-valuemax={MAX * 100}
            aria-valuenow={Math.round(threshold * 100)}
            aria-valuetext={`Review verdicts below ${pct(threshold)} confidence`}
            onKeyDown={(e) => {
              const step = { ArrowRight: 0.01, ArrowUp: 0.01, ArrowLeft: -0.01, ArrowDown: -0.01, PageUp: 0.05, PageDown: -0.05 }[e.key];
              if (step !== undefined) onThreshold(clamp(threshold + step));
              else if (e.key === "Home") onThreshold(MIN);
              else if (e.key === "End") onThreshold(MAX);
              else return;
              e.preventDefault();
            }}
            className="absolute -top-1 size-4 -translate-x-1/2 cursor-ew-resize rounded-full border-2 border-surface bg-ink shadow"
            style={{ left: `${threshold * 100}%` }}
          />
        </div>

        {/* X axis */}
        <div />
        <div className="relative mr-10 mt-1 h-4 text-[11px] tabular-nums text-muted" aria-hidden>
          {[0, 0.5, 1].map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t * 100}%` }}>
              {pct(t)}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[13px] text-ink-2">
        <span className="font-medium text-ink">{review}</span> of {rows.length} verdicts fall below the line and are sent to a person. Drag the
        line, or focus it and use the arrow keys.
      </p>
      {tip.node}
    </div>
  );
}
