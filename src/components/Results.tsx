"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CheckResult, Verdict } from "@/lib/types";
import { judgeAll, VERDICT_LABEL, type Judgement } from "@/lib/verdict";
import { cellColor, pct, prefersReducedMotion, seconds, tokens, usd, VERDICT_STYLE } from "./ui";

interface Props {
  result: CheckResult;
  labels: Verdict[] | null;
  origin: "saved" | "live";
  autoAccept: number;
  onAutoAccept: (v: number) => void;
}

const isIssue = (j: Judgement) => j.verdict === "contradicted" || j.verdict === "unsupported" || (j.verdict === "supported" && j.needsReview);

export function Results({ result, labels, origin, autoAccept, onAutoAccept }: Props) {
  const judgements = useMemo(() => judgeAll(result, autoAccept), [result, autoAccept]);
  const issues = judgements.flatMap((j, s) => (isIssue(j) ? [s] : []));
  const [selected, setSelected] = useState(issues[0] ?? 0);
  const [hoveredPassage, setHoveredPassage] = useState<number | null>(null);
  const sentenceEls = useRef<(HTMLSpanElement | null)[]>([]);

  const select = (s: number, scroll = false) => {
    setSelected(s);
    if (scroll) {
      sentenceEls.current[s]?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };
  const stepIssue = (dir: 1 | -1) => {
    if (!issues.length) return;
    const pos = issues.indexOf(selected);
    const next =
      pos === -1
        ? dir === 1
          ? (issues.find((s) => s > selected) ?? issues[0])
          : ([...issues].reverse().find((s) => s < selected) ?? issues[issues.length - 1])
        : issues[(pos + dir + issues.length) % issues.length];
    select(next, true);
  };

  // Arrow keys step through sentences, N jumps to the next issue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const last = result.sentences.length - 1;
      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        select(Math.min(last, selected + 1), true);
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        select(Math.max(0, selected - 1), true);
      } else if (e.key === "n") {
        stepIssue(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div>
      <VerdictBar
        result={result}
        judgements={judgements}
        issues={issues}
        selected={selected}
        onStep={stepIssue}
        autoAccept={autoAccept}
        onAutoAccept={onAutoAccept}
      />
      <Board
        result={result}
        judgements={judgements}
        labels={labels}
        selected={selected}
        onSelect={select}
        sentenceEls={sentenceEls}
        hoveredPassage={hoveredPassage}
        onHoverPassage={setHoveredPassage}
      />
      <Grid
        result={result}
        judgements={judgements}
        selected={selected}
        onSelect={(s) => select(s, true)}
        hoveredPassage={hoveredPassage}
        onHoverPassage={setHoveredPassage}
      />
      <RunStats result={result} origin={origin} labels={labels} judgements={judgements} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function VerdictBar({
  result,
  judgements,
  issues,
  selected,
  onStep,
  autoAccept,
  onAutoAccept,
}: {
  result: CheckResult;
  judgements: Judgement[];
  issues: number[];
  selected: number;
  onStep: (dir: 1 | -1) => void;
  autoAccept: number;
  onAutoAccept: (v: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const count = (v: Verdict) => judgements.filter((j) => j.verdict === v).length;
  const claims = judgements.length - count("not_claim");
  const backed = count("supported");
  const pos = issues.indexOf(selected);
  const flags = [
    count("contradicted") && `${count("contradicted")} contradicted`,
    count("unsupported") && `${count("unsupported")} with no source`,
  ].filter(Boolean);

  async function copyReport() {
    const lines = result.sentences.flatMap((s, i) => {
      const j = judgements[i];
      if (j.verdict === "not_claim") return [];
      const p = j.passage !== null ? result.passages[j.passage] : null;
      const icon = { supported: "✅", contradicted: "❌", unsupported: "⚠️", not_claim: "" }[j.verdict];
      const src = p && j.verdict !== "unsupported" ? `\n  > P${p.i + 1}, ${p.doc}: ${p.text}` : "";
      return [`- ${icon} **${VERDICT_LABEL[j.verdict]}** (${pct(j.confidence)}${j.needsReview ? ", needs review" : ""}): ${s.text}${src}`];
    });
    const text = [
      "## Alibi report",
      "",
      `**Question:** ${result.question}`,
      `**Backed:** ${backed} of ${claims} claims${flags.length ? `, ${flags.join(", ")}` : ""}`,
      "",
      ...lines,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="z-30 -mx-4 border-y border-rule bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:border-t-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-2 w-20 shrink-0 overflow-hidden rounded-full bg-rule" aria-hidden>
            {(["supported", "contradicted", "unsupported"] as Verdict[]).map((v) => (
              <div key={v} className={VERDICT_STYLE[v].dot} style={{ width: `${claims ? (count(v) / claims) * 100 : 0}%` }} />
            ))}
          </div>
          <p className="text-[15px] leading-tight">
            <span className="font-semibold tabular-nums">
              {backed} of {claims} claims backed
            </span>
            <span className="hidden text-ink-2 xl:inline">{flags.length ? `, ${flags.join(", ")}` : ", nothing flagged"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStep(-1)}
            disabled={!issues.length}
            className="rounded-md border border-rule px-2.5 py-1 text-sm hover:border-ink-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="min-w-[6.5rem] text-center text-sm tabular-nums text-ink-2" aria-live="polite">
            {issues.length === 0 ? "No issues" : pos >= 0 ? `Issue ${pos + 1} of ${issues.length}` : `${issues.length} issues`}
          </span>
          <button
            onClick={() => onStep(1)}
            disabled={!issues.length}
            className="rounded-md bg-ink px-2.5 py-1 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-40"
          >
            Next issue
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-2">
          <span className="whitespace-nowrap">Review below</span>
          <input
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={autoAccept}
            onChange={(e) => onAutoAccept(Number(e.target.value))}
            className="w-24 accent-[var(--pencil)]"
          />
          <span className="w-9 tabular-nums text-ink">{pct(autoAccept)}</span>
        </label>

        <button onClick={copyReport} className="ml-auto rounded-md border border-rule px-2.5 py-1 text-sm hover:border-ink-2">
          {copied ? "Report copied" : "Copy report"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface BoardProps {
  result: CheckResult;
  judgements: Judgement[];
  labels: Verdict[] | null;
  selected: number;
  onSelect: (s: number) => void;
  sentenceEls: React.RefObject<(HTMLSpanElement | null)[]>;
  hoveredPassage: number | null;
  onHoverPassage: (p: number | null) => void;
}

const LINK_MIN = 0.35;

function Board({ result, judgements, labels, selected, onSelect, sentenceEls, hoveredPassage, onHoverPassage }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const passageEls = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<{ key: string; d: string; color: string; w: number; o: number }[]>([]);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  // Pencil lines from the selected sentence to every passage that backs or refutes it.
  useLayoutEffect(() => {
    const compute = () => {
      const board = boardRef.current;
      const sheet = sheetRef.current;
      const sentence = sentenceEls.current[selected];
      if (!board || !sheet || !sentence || window.innerWidth < 1024) {
        setPaths([]);
        setOrigin(null);
        return;
      }
      const b = board.getBoundingClientRect();
      const a = sheet.getBoundingClientRect();
      const lines = sentence.getClientRects();
      const r = lines[lines.length - 1] ?? sentence.getBoundingClientRect();
      const x0 = a.right - b.left;
      const y0 = r.top + r.height / 2 - b.top;
      const out: typeof paths = [];
      result.cells[selected].forEach(([sup, con], p) => {
        const strength = Math.max(sup, con);
        const el = passageEls.current[p];
        if (strength < LINK_MIN || !el) return;
        const pr = el.getBoundingClientRect();
        const x1 = pr.left - b.left;
        const y1 = pr.top + Math.min(24, pr.height / 2) - b.top;
        const mx = (x0 + x1) / 2;
        out.push({
          key: `${selected}-${p}`,
          d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`,
          color: con > sup ? "var(--refuted)" : "var(--backed)",
          w: 1 + strength * 2,
          o: 0.35 + strength * 0.6,
        });
      });
      setPaths(out);
      setOrigin({ x: x0, y: y0 });
    };

    compute();
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    const ro = new ResizeObserver(schedule);
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [selected, result, sentenceEls]);

  const sel = judgements[selected];

  return (
    <div ref={boardRef} className="relative mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] lg:gap-0">
      <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block" aria-hidden>
        {paths.map((p) => (
          <path key={p.key} d={p.d} pathLength={1} fill="none" stroke={p.color} strokeWidth={p.w} strokeOpacity={p.o} strokeLinecap="round" className="connector" />
        ))}
        {origin && paths.length > 0 && <circle cx={origin.x} cy={origin.y} r={3.5} fill="var(--pencil)" />}
      </svg>

      {/* The answer, marked up */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div ref={sheetRef} className="rounded-[4px] bg-sheet px-6 py-6 shadow-[0_1px_0_var(--rule),0_12px_32px_-18px_rgba(23,32,54,0.35)] sm:px-8">
          <p className="text-sm text-ink-2">
            <span className="font-medium text-ink">Asked:</span> {result.question}
          </p>
          <p className="mt-4 font-serif text-[1.125rem] leading-[1.9]">
            {result.sentences.map((s, i) => {
              const j = judgements[i];
              const isSel = i === selected;
              const dim = hoveredPassage !== null && Math.max(result.cells[i][hoveredPassage][0], result.cells[i][hoveredPassage][1]) < 0.5;
              const mismatch = labels && labels[i] !== j.verdict;
              return (
                <span key={i}>
                  <span
                    ref={(el) => {
                      sentenceEls.current[i] = el;
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSel}
                    aria-label={`Sentence ${i + 1}, ${VERDICT_LABEL[j.verdict]}: ${s.text}`}
                    onClick={() => onSelect(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(i);
                      }
                    }}
                    className={[
                      VERDICT_STYLE[j.verdict].mark,
                      "cursor-pointer transition-[opacity,box-shadow] duration-150",
                      isSel ? "shadow-[0_0_0_2px_var(--pencil)]" : "hover:shadow-[0_0_0_1px_var(--rule)]",
                      dim ? "opacity-30" : "",
                    ].join(" ")}
                  >
                    {s.text}
                  </span>
                  {j.needsReview && (
                    <sup className="ml-0.5 font-sans text-[11px] font-semibold text-pencil" title="Below the review threshold">
                      ?
                    </sup>
                  )}
                  {mismatch && (
                    <sup className="ml-0.5 font-sans text-[11px] font-semibold text-pencil" title={`Hand label: ${VERDICT_LABEL[labels![i]]}`}>
                      ≠
                    </sup>
                  )}{" "}
                </span>
              );
            })}
          </p>
        </div>

        <SentenceNote result={result} judgement={sel} s={selected} label={labels?.[selected] ?? null} />
        <p className="mt-3 hidden text-xs text-ink-2 lg:block">
          Click a sentence, or press <kbd className="rounded border border-rule bg-sheet px-1">←</kbd>{" "}
          <kbd className="rounded border border-rule bg-sheet px-1">→</kbd> to step through and{" "}
          <kbd className="rounded border border-rule bg-sheet px-1">N</kbd> for the next issue.
        </p>
      </div>

      <div className="hidden lg:block" />

      {/* Sources */}
      <div>
        <h3 className="mb-3 text-sm text-ink-2">
          <span className="font-medium text-ink">Sources.</span> {result.passages.length} passages, each checked against every sentence.
        </h3>
        <div className="space-y-3">
          {result.passages.map((p) => {
            const [sup, con, none] = result.cells[selected][p.i];
            const rel = con > sup && con >= LINK_MIN ? "contradicts" : sup >= LINK_MIN ? "backs" : null;
            return (
              <div
                key={p.i}
                ref={(el) => {
                  passageEls.current[p.i] = el;
                }}
                onMouseEnter={() => onHoverPassage(p.i)}
                onMouseLeave={() => onHoverPassage(null)}
                className={[
                  "rounded-[4px] border bg-sheet px-4 py-3.5 transition-[opacity,border-color] duration-200",
                  rel === "backs" ? "border-backed" : rel === "contradicts" ? "border-refuted" : "border-rule",
                  rel || sel.verdict === "not_claim" ? "" : "opacity-55",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">
                    <span className="mr-1.5 rounded-full bg-paper px-1.5 py-px font-semibold tabular-nums">P{p.i + 1}</span>
                    <span className="text-ink-2">{p.doc}</span>
                  </span>
                  <span
                    className={`shrink-0 ${rel === "backs" ? "text-backed" : rel === "contradicts" ? "text-refuted" : "text-ink-2"}`}
                  >
                    {rel === "backs" ? `Backs it, ${pct(sup)}` : rel === "contradicts" ? `Contradicts it, ${pct(con)}` : `Silent, ${pct(none)}`}
                  </span>
                </div>
                <p className="mt-1.5 font-serif text-[15px] leading-relaxed">{p.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SentenceNote({ result, judgement, s, label }: { result: CheckResult; judgement: Judgement; s: number; label: Verdict | null }) {
  const st = VERDICT_STYLE[judgement.verdict];
  const passage = judgement.passage !== null ? result.passages[judgement.passage] : null;
  const explain: Record<Verdict, string> = {
    supported: "A source passage says this, or directly implies it.",
    contradicted: "A source passage says the opposite. A reader who trusts this sentence would be misled.",
    unsupported: "No passage backs this up or rules it out. The model may have invented it.",
    not_claim: "A greeting or sign-off, so there is nothing to check.",
  };

  return (
    <div className="mt-4 rounded-[4px] border-l-[3px] bg-sheet px-5 py-4" style={{ borderColor: st.color }}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`font-semibold ${st.text}`}>{VERDICT_LABEL[judgement.verdict]}</span>
        <span className="text-sm text-ink-2">Sentence {s + 1}</span>
        {judgement.verdict !== "not_claim" && <span className="text-sm tabular-nums text-ink-2">Engine is {pct(judgement.confidence)} sure</span>}
        {judgement.needsReview && <span className="rounded-full bg-pencil-soft px-2 py-px text-xs font-medium text-pencil">Needs a human check</span>}
      </div>
      <p className="mt-1.5 text-[15px] text-ink-2">{explain[judgement.verdict]}</p>
      {passage && judgement.verdict !== "not_claim" && (
        <blockquote className="mt-3 border-l border-rule pl-3">
          <p className="text-xs text-ink-2">
            {judgement.verdict === "unsupported" ? "Closest passage" : "Source"}: P{passage.i + 1}, {passage.doc}
          </p>
          <p className="mt-1 font-serif text-[14.5px] leading-relaxed">{passage.text}</p>
        </blockquote>
      )}
      {label && (
        <p className="mt-3 text-xs text-ink-2">
          Hand label: <span className={VERDICT_STYLE[label].text}>{VERDICT_LABEL[label]}</span>.{" "}
          {label === judgement.verdict ? "The engine agrees." : <span className="font-medium text-pencil">The engine disagrees.</span>}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Grid({
  result,
  judgements,
  selected,
  onSelect,
  hoveredPassage,
  onHoverPassage,
}: {
  result: CheckResult;
  judgements: Judgement[];
  selected: number;
  onSelect: (s: number) => void;
  hoveredPassage: number | null;
  onHoverPassage: (p: number | null) => void;
}) {
  const n = result.passages.length;
  const total = result.sentences.length * n;
  return (
    <section className="mt-14 border-t border-rule pt-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-12">
        <div>
          <h3 className="text-[1.3125rem] font-semibold tracking-[-0.01em]">Every check, at once</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            Each square is one question to the engine: does this passage back, contradict, or ignore this sentence? All {total} were
            asked in parallel. Green backs a sentence, red contradicts it, and darker means surer.
          </p>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="grid w-max gap-[3px]" style={{ gridTemplateColumns: `2.5rem repeat(${n}, 2rem)` }}>
            <div />
            {result.passages.map((p) => (
              <div key={p.i} className={`pb-1 text-center text-[11px] tabular-nums ${hoveredPassage === p.i ? "font-semibold text-ink" : "text-ink-2"}`}>
                P{p.i + 1}
              </div>
            ))}
            {result.sentences.map((_, si) => (
              <div key={si} className="contents">
                <button
                  onClick={() => onSelect(si)}
                  className={`flex items-center gap-1.5 text-[11px] tabular-nums ${si === selected ? "font-semibold text-ink" : "text-ink-2"}`}
                  aria-label={`Select sentence ${si + 1}`}
                >
                  <span className={`size-1.5 rounded-full ${VERDICT_STYLE[judgements[si].verdict].dot}`} />S{si + 1}
                </button>
                {result.cells[si].map(([sup, con, none], p) => (
                  <button
                    key={p}
                    onClick={() => onSelect(si)}
                    onMouseEnter={() => onHoverPassage(p)}
                    onMouseLeave={() => onHoverPassage(null)}
                    title={`S${si + 1} and P${p + 1}: backs ${pct(sup)}, contradicts ${pct(con)}, silent ${pct(none)}`}
                    aria-label={`Sentence ${si + 1}, passage ${p + 1}: backs ${pct(sup)}, contradicts ${pct(con)}`}
                    className={[
                      "cell-in h-6 rounded-[3px]",
                      si === selected ? "outline outline-2 -outline-offset-1 outline-[var(--pencil)]" : "",
                      judgements[si].verdict === "not_claim" ? "opacity-25" : "",
                    ].join(" ")}
                    style={{ background: cellColor(sup, con), animationDelay: `${(si * n + p) * 5}ms` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function GridSkeleton({ sentences, passages }: { sentences: number; passages: number }) {
  const total = sentences * passages;
  return (
    <div className="rounded-[4px] bg-sheet p-6" role="status" aria-live="polite">
      <p className="text-[15px] font-medium">
        Asking {total + sentences} questions in {passages + 1} parallel calls
      </p>
      <p className="mt-1 text-sm text-ink-2">One call per passage, with every sentence as its own question inside it.</p>
      <div className="mt-5 grid w-max max-w-full gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, passages)}, minmax(0.75rem, 2rem))` }}>
        {Array.from({ length: total }, (_, k) => (
          <div
            key={k}
            className="cell-wave h-6 rounded-[3px] bg-rule"
            style={{ animationDelay: `${((k % passages) + Math.floor(k / passages)) * 70}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function RunStats({ result, origin, labels, judgements }: { result: CheckResult; origin: "saved" | "live"; labels: Verdict[] | null; judgements: Judgement[] }) {
  const { meta } = result;
  const isMock = meta.model === "mock";
  const agree = labels ? judgements.filter((j, s) => j.verdict === labels[s]).length : 0;
  const when = new Date(meta.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <p className="mt-8 max-w-[52rem] text-sm leading-relaxed text-ink-2">
      {origin === "saved" ? `Saved run from ${when}` : "Live run"} on {meta.engine} ({meta.model}). {meta.questions} questions in{" "}
      {meta.calls} parallel calls, {seconds(meta.ms)}
      {!isMock && `, ${tokens(meta.inputTokens)} input tokens, about ${usd(meta.listPriceUsd)} at Jev's list price`}.
      {labels && (
        <>
          {" "}
          The engine matches the hand labels on{" "}
          <span className="font-medium text-ink">
            {agree} of {labels.length}
          </span>{" "}
          sentences{agree < labels.length ? ", and each disagreement is marked ≠" : ""}.
        </>
      )}
    </p>
  );
}
