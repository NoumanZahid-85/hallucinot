"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CheckResult, Verdict } from "@/lib/types";
import { judgeAll, VERDICT_LABEL, type Judgement } from "@/lib/verdict";
import { ArrowLeft, ArrowRight, Bolt, Check, Copy, Cross, Flag, Grid as GridIcon, Question, Spinner } from "./Icons";
import { cellColor, date, pct, prefersReducedMotion, seconds, tokens, usd, VERDICT_REASON, VERDICT_STYLE } from "./ui";

interface Props {
  result: CheckResult;
  labels: Verdict[] | null;
  flags: number[];
  origin: "saved" | "live";
  autoAccept: number;
  onAutoAccept: (v: number) => void;
  running: boolean;
  canRunLive: boolean;
  onRunLive: () => void;
  onPlayAgain?: () => void;
  onNext?: () => void;
  onEdit?: () => void;
  onToast: (message: string) => void;
}

const LINK_MIN = 0.35;
const isProblem = (v: Verdict) => v === "contradicted" || v === "unsupported";
const VERDICT_ICON: Record<Verdict, typeof Check> = { supported: Check, contradicted: Cross, unsupported: Question, not_claim: Check };

export function Review(props: Props) {
  const { result, labels, flags, autoAccept } = props;
  const judgements = useMemo(() => judgeAll(result, autoAccept), [result, autoAccept]);
  const issues = judgements.flatMap((j, s) => (isProblem(j.verdict) || (j.verdict === "supported" && j.needsReview) ? [s] : []));
  const [selected, setSelected] = useState(issues[0] ?? 0);
  const [filter, setFilter] = useState<Verdict | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const sentenceEls = useRef<(HTMLSpanElement | null)[]>([]);

  const select = (s: number, scroll = false) => {
    setSelected(s);
    if (scroll) sentenceEls.current[s]?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };
  const step = (dir: 1 | -1) => {
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

  // ← → step through sentences, N jumps to the next issue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        select(Math.min(result.sentences.length - 1, selected + 1), true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        select(Math.max(0, selected - 1), true);
      } else if (e.key === "n" || e.key === "N") {
        step(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function copyReport() {
    const lines = result.sentences.flatMap((s, i) => {
      const j = judgements[i];
      if (j.verdict === "not_claim") return [];
      const p = j.passage !== null ? result.passages[j.passage] : null;
      const icon = { supported: "✅", contradicted: "❌", unsupported: "⚠️", not_claim: "" }[j.verdict];
      const src = p && j.verdict !== "unsupported" ? `\n  > P${p.i + 1}, ${p.doc}: ${p.text}` : "";
      return [`- ${icon} **${VERDICT_LABEL[j.verdict]}** (${pct(j.confidence)}): ${s.text}${src}`];
    });
    try {
      await navigator.clipboard.writeText([`## Hallucinot Report`, "", `**Question:** ${result.question}`, "", ...lines].join("\n"));
      props.onToast("Report copied as Markdown");
    } catch {
      props.onToast("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div>
      <ScoreCard {...props} judgements={judgements} />

      {/* Toolbar */}
      <div className="z-20 mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card/90 p-2 backdrop-blur lg:sticky lg:top-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter sentences by verdict">
          {(["supported", "contradicted", "unsupported"] as Verdict[]).map((v) => {
            const n = judgements.filter((j) => j.verdict === v).length;
            const Icon = VERDICT_ICON[v];
            const on = filter === v;
            return (
              <button
                key={v}
                aria-pressed={on}
                disabled={!n}
                onClick={() => {
                  setFilter(on ? null : v);
                  const first = judgements.findIndex((j) => j.verdict === v);
                  if (!on && first >= 0) select(first, true);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-40 ${
                  on ? `${VERDICT_STYLE[v].dot} text-card` : `${VERDICT_STYLE[v].soft} ${VERDICT_STYLE[v].text} hover:brightness-95`
                }`}
              >
                <Icon className="size-4" />
                <span className="tabular-nums">{n}</span> {VERDICT_LABEL[v]}
              </button>
            );
          })}
        </div>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <div className="flex items-center gap-1">
          <IconButton label="Previous Issue" onClick={() => step(-1)} disabled={!issues.length}>
            <ArrowLeft className="size-4" />
          </IconButton>
          <span className="min-w-14 text-center text-sm tabular-nums text-muted" aria-live="polite">
            {issues.length ? `${Math.max(1, issues.indexOf(selected) + 1)} / ${issues.length}` : "0 / 0"}
          </span>
          <IconButton label="Next Issue" onClick={() => step(1)} disabled={!issues.length}>
            <ArrowRight className="size-4" />
          </IconButton>
        </div>

        <label className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm text-muted" title="Verdicts below this confidence get a ? for a person to check">
          Trust Above
          <input
            type="range"
            name="trust"
            min={0.5}
            max={0.99}
            step={0.01}
            value={autoAccept}
            onChange={(e) => props.onAutoAccept(Number(e.target.value))}
            className="w-24 accent-[var(--brand)]"
          />
          <span className="w-9 font-bold tabular-nums text-ink">{pct(autoAccept)}</span>
        </label>

        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Copy Report" onClick={copyReport}>
            <Copy className="size-4" />
          </IconButton>
          {props.onEdit && (
            <button onClick={props.onEdit} className="rounded-xl px-3 py-1.5 text-sm font-bold text-muted transition-colors hover:bg-bg hover:text-ink">
              Edit Text
            </button>
          )}
          {props.canRunLive && (
            <button
              onClick={props.onRunLive}
              disabled={props.running}
              className="flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand transition-colors hover:bg-brand hover:text-brand-ink disabled:opacity-60"
            >
              {props.running ? <Spinner className="size-4" /> : <Bolt className="size-4" />}
              {props.running ? "Running…" : "Run Live"}
            </button>
          )}
        </div>
      </div>

      <Board
        result={result}
        judgements={judgements}
        labels={labels}
        flags={flags}
        selected={selected}
        onSelect={select}
        filter={filter}
        hovered={hovered}
        onHover={setHovered}
        sentenceEls={sentenceEls}
      />

      <div className="mt-8">
        <button
          onClick={() => setShowGrid((v) => !v)}
          aria-expanded={showGrid}
          aria-controls="all-checks"
          className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
        >
          <GridIcon className="size-4" />
          {showGrid ? "Hide All Checks" : `Show All ${result.sentences.length * result.passages.length} Checks`}
        </button>
        {showGrid && (
          <div id="all-checks" className="rise mt-4">
            <CheckGrid result={result} judgements={judgements} selected={selected} onSelect={(s) => select(s, true)} hovered={hovered} onHover={setHovered} />
          </div>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        {props.origin === "saved" ? `Saved run, ${date(result.meta.createdAt)}` : "Live run"}. <span translate="no">{result.meta.engine}</span>,{" "}
        {result.meta.questions} checks in {seconds(result.meta.ms)}
        {result.meta.model !== "mock" && `, ${tokens(result.meta.inputTokens)} tokens, about ${usd(result.meta.listPriceUsd)} at Jev pricing`}.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ScoreCard({ labels, flags, judgements, onPlayAgain, onNext }: Props & { judgements: Judgement[] }) {
  const truth = labels ? labels.map(isProblem) : judgements.map((j) => isProblem(j.verdict));
  const total = truth.filter(Boolean).length;
  const engineCaught = judgements.filter((j, s) => truth[s] && isProblem(j.verdict)).length;
  const played = flags.length > 0;
  const caught = flags.filter((s) => truth[s]).length;
  const falseAlarms = flags.length - caught;
  const claims = judgements.filter((j) => j.verdict !== "not_claim").length;

  let headline: string;
  let sub: string;
  if (!labels) {
    headline = total === 0 ? "Every Claim Checks Out" : `${total} of ${claims} Claims Look Made Up`;
    sub = total === 0 ? "Each claim is backed by your sources." : "Click a highlighted sentence to see why.";
  } else if (played) {
    headline = caught === total ? `You Caught All ${total}!` : `You Caught ${caught} of ${total}`;
    sub = falseAlarms ? `Plus ${falseAlarms} false ${falseAlarms === 1 ? "alarm" : "alarms"}.` : "No false alarms.";
  } else {
    headline = `${total} Made-Up Claims Inside`;
    sub = "Click a highlighted sentence to see the evidence.";
  }

  return (
    <div className="pop flex flex-col gap-4 rounded-3xl bg-ink p-5 text-bg sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:p-6" role="status">
      <div className="min-w-0 sm:flex-1">
        <p className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">{headline}</p>
        <p className="mt-1 text-[15px] opacity-75">{sub}</p>
      </div>
      {labels && (
        <div className="flex items-center gap-3">
          <ScoreDots label="You" hit={played ? caught : 0} total={total} muted={!played} />
          <ScoreDots label="Hallucinot" hit={engineCaught} total={total} />
        </div>
      )}
      <div className="flex gap-2">
        {onPlayAgain && labels && (
          <button onClick={onPlayAgain} className="rounded-xl px-4 py-2 text-sm font-bold opacity-80 transition-opacity hover:opacity-100">
            Play Again
          </button>
        )}
        {onNext && (
          <button onClick={onNext} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-ink transition-transform hover:scale-[1.03]">
            Next Example
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreDots({ label, hit, total, muted }: { label: string; hit: number; total: number; muted?: boolean }) {
  return (
    <div className={`rounded-2xl bg-bg/10 px-3.5 py-2 ${muted ? "opacity-50" : ""}`}>
      <p className="text-xs opacity-75" translate={label === "Hallucinot" ? "no" : undefined}>
        {label}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`size-2.5 rounded-full ${i < hit ? "bg-brand" : "bg-bg/25"}`} />
        ))}
        <span className="ml-1 font-display text-lg font-bold tabular-nums">
          {hit}/{total}
        </span>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-bg hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

interface BoardProps {
  result: CheckResult;
  judgements: Judgement[];
  labels: Verdict[] | null;
  flags: number[];
  selected: number;
  onSelect: (s: number) => void;
  filter: Verdict | null;
  hovered: number | null;
  onHover: (p: number | null) => void;
  sentenceEls: React.RefObject<(HTMLSpanElement | null)[]>;
}

function Board({ result, judgements, labels, flags, selected, onSelect, filter, hovered, onHover, sentenceEls }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const passageEls = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<{ key: string; d: string; color: string; w: number; o: number }[]>([]);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const sel = judgements[selected];

  // Lines from the selected sentence to each passage that backs or contradicts it.
  // Layout is read in an effect (never during render), batched per animation frame.
  useLayoutEffect(() => {
    const compute = () => {
      const board = boardRef.current, bubble = bubbleRef.current, sentence = sentenceEls.current[selected];
      if (!board || !bubble || !sentence || window.innerWidth < 1024) {
        setPaths([]);
        setDot(null);
        return;
      }
      const b = board.getBoundingClientRect();
      const a = bubble.getBoundingClientRect();
      const rects = sentence.getClientRects();
      const r = rects[rects.length - 1] ?? sentence.getBoundingClientRect();
      const x0 = a.right - b.left, y0 = r.top + r.height / 2 - b.top;
      const out: typeof paths = [];
      result.cells[selected].forEach(([sup, con], p) => {
        const strength = Math.max(sup, con), el = passageEls.current[p];
        if (strength < LINK_MIN || !el) return;
        const pr = el.getBoundingClientRect();
        const x1 = pr.left - b.left, y1 = pr.top + Math.min(26, pr.height / 2) - b.top, mx = (x0 + x1) / 2;
        out.push({
          key: `${selected}-${p}`,
          d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`,
          color: con > sup ? "var(--refuted)" : "var(--backed)",
          w: 1.2 + strength * 2,
          o: 0.35 + strength * 0.6,
        });
      });
      setPaths(out);
      setDot({ x: x0, y: y0 });
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
  }, [selected, result, sentenceEls, opened]);

  return (
    <div ref={boardRef} className="relative mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.1fr)_48px_minmax(0,1fr)] lg:gap-0">
      <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block" aria-hidden>
        {paths.map((p) => (
          <path key={p.key} d={p.d} pathLength={1} fill="none" stroke={p.color} strokeWidth={p.w} strokeOpacity={p.o} strokeLinecap="round" className="connector" />
        ))}
        {dot && paths.length > 0 && <circle cx={dot.x} cy={dot.y} r={4} fill="var(--brand)" />}
      </svg>

      {/* Chat */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <QuestionBubble question={result.question} />
        <div className="mt-3 flex gap-3">
          <BotAvatar />
          <div ref={bubbleRef} className="min-w-0 flex-1 break-words rounded-3xl rounded-tl-md border border-line bg-card px-5 py-4 text-[17px] leading-[1.95]">
            {result.sentences.map((s, i) => {
              const j = judgements[i];
              const isSel = i === selected;
              const dim =
                (filter !== null && j.verdict !== filter) ||
                (hovered !== null && Math.max(result.cells[i][hovered][0], result.cells[i][hovered][1]) < 0.5);
              return (
                <span key={i}>
                  {/* An inline span, not a <button>: buttons can't wrap a highlight across lines. Keyboard handled below. */}
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
                      "sweep cursor-pointer transition-[opacity,box-shadow] duration-150",
                      isSel ? "shadow-[0_0_0_2px_var(--brand)]" : "hover:shadow-[0_0_0_1px_var(--line)]",
                      dim ? "opacity-25" : "",
                    ].join(" ")}
                    style={{ animationDelay: `${i * 110}ms` }}
                  >
                    {s.text}
                  </span>
                  {flags.includes(i) && <Flag className="ml-0.5 inline size-3.5 -translate-y-1 text-brand" />}
                  {j.needsReview && <sup className="ml-0.5 font-bold text-brand" title="Below your trust level, worth a human look">?</sup>}
                  {labels && labels[i] !== j.verdict && (
                    <sup className="ml-0.5 font-bold text-muted" title={`Hand label: ${VERDICT_LABEL[labels[i]]}`}>
                      ≠
                    </sup>
                  )}{" "}
                </span>
              );
            })}
          </div>
        </div>
        <p className="mt-3 hidden pl-12 text-xs text-muted lg:block">
          Tip: <kbd className="rounded border border-line bg-card px-1">←</kbd> <kbd className="rounded border border-line bg-card px-1">→</kbd> step through
          sentences, <kbd className="rounded border border-line bg-card px-1">N</kbd> jumps to the next issue.
        </p>
      </div>

      <div className="hidden lg:block" />

      {/* Evidence */}
      <div>
        <VerdictCard result={result} judgement={sel} s={selected} flagged={flags.includes(selected)} />
        <div className="mt-4 space-y-2">
          {result.passages.map((p) => {
            const [sup, con, none] = result.cells[selected][p.i];
            const rel = con > sup && con >= LINK_MIN ? "contradicts" : sup >= LINK_MIN ? "backs" : null;
            const open = rel !== null || opened.has(p.i);
            const tone = rel === "backs" ? "border-backed" : rel === "contradicts" ? "border-refuted" : "border-line";
            return (
              <div
                key={p.i}
                ref={(el) => {
                  passageEls.current[p.i] = el;
                }}
                onMouseEnter={() => onHover(p.i)}
                onMouseLeave={() => onHover(null)}
                className={`rounded-2xl border-2 bg-card transition-colors duration-200 ${tone}`}
              >
                <button
                  onClick={() =>
                    setOpened((o) => {
                      const n = new Set(o);
                      if (n.has(p.i)) n.delete(p.i);
                      else n.add(p.i);
                      return n;
                    })
                  }
                  disabled={rel !== null}
                  aria-expanded={open}
                  className="flex w-full min-w-0 items-center gap-2 px-4 py-2.5 text-left text-sm disabled:cursor-default"
                >
                  <span className="rounded-lg bg-bg px-1.5 py-0.5 font-bold tabular-nums">P{p.i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{open ? p.doc : p.text}</span>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${
                      rel === "backs" ? "bg-backed-hl text-backed" : rel === "contradicts" ? "bg-refuted-hl text-refuted" : "text-muted"
                    }`}
                  >
                    {rel === "backs" ? `Backs ${pct(sup)}` : rel === "contradicts" ? `Contradicts ${pct(con)}` : `Silent ${pct(none)}`}
                  </span>
                </button>
                {open && <p className="rise px-4 pb-3.5 text-[15px] leading-relaxed">{p.text}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VerdictCard({ result, judgement, s, flagged }: { result: CheckResult; judgement: Judgement; s: number; flagged: boolean }) {
  const st = VERDICT_STYLE[judgement.verdict];
  const Icon = VERDICT_ICON[judgement.verdict];
  const passage = judgement.passage !== null ? result.passages[judgement.passage] : null;
  const via = passage && (judgement.verdict === "supported" || judgement.verdict === "contradicted") ? ` (P${passage.i + 1})` : "";
  return (
    <div key={s} className={`rise rounded-3xl p-5 ${st.soft}`} aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-full text-card ${st.dot}`}>
          <Icon className="size-4.5" />
        </span>
        <span className={`font-display text-xl font-bold ${st.text}`}>{VERDICT_LABEL[judgement.verdict]}</span>
        <span className="text-sm text-muted">Sentence {s + 1}</span>
        {flagged && (
          <span className="flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-brand">
            <Flag className="size-3" /> You Flagged This
          </span>
        )}
      </div>
      <p className="mt-2 text-[15px]">
        {VERDICT_REASON[judgement.verdict]}
        {via}
      </p>
      {judgement.verdict !== "not_claim" && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="text-muted">Confidence</span>
          <div
            role="meter"
            aria-label="Engine confidence"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(judgement.confidence * 100)}
            className="h-2 flex-1 overflow-hidden rounded-full bg-card"
          >
            <div className={`h-full rounded-full ${st.dot}`} style={{ width: `${judgement.confidence * 100}%` }} />
          </div>
          <span className="w-10 text-right font-bold tabular-nums">{pct(judgement.confidence)}</span>
        </div>
      )}
    </div>
  );
}

export function QuestionBubble({ question }: { question: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-3xl rounded-br-md bg-brand px-5 py-3 text-[15px] leading-relaxed text-brand-ink break-words">{question}</p>
    </div>
  );
}

export function BotAvatar() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-card font-display text-sm font-bold text-brand" aria-hidden>
      AI
    </span>
  );
}

// ---------------------------------------------------------------------------

function CheckGrid({
  result,
  judgements,
  selected,
  onSelect,
  hovered,
  onHover,
}: {
  result: CheckResult;
  judgements: Judgement[];
  selected: number;
  onSelect: (s: number) => void;
  hovered: number | null;
  onHover: (p: number | null) => void;
}) {
  const n = result.passages.length;
  return (
    <div className="rounded-3xl border border-line bg-card p-5">
      <p className="text-sm text-muted">Each square is one question: does this passage back or contradict this sentence?</p>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid w-max gap-1" style={{ gridTemplateColumns: `2.5rem repeat(${n}, 2rem)` }}>
          <div />
          {result.passages.map((p) => (
            <div key={p.i} className={`pb-1 text-center text-xs tabular-nums ${hovered === p.i ? "font-bold text-ink" : "text-muted"}`}>
              P{p.i + 1}
            </div>
          ))}
          {result.sentences.map((_, si) => (
            <div key={si} className="contents">
              <button
                onClick={() => onSelect(si)}
                aria-label={`Select sentence ${si + 1}`}
                className={`flex items-center gap-1.5 text-xs tabular-nums ${si === selected ? "font-bold text-ink" : "text-muted"}`}
              >
                <span className={`size-2 rounded-full ${VERDICT_STYLE[judgements[si].verdict].dot}`} />S{si + 1}
              </button>
              {result.cells[si].map(([sup, con, none], p) => (
                <button
                  key={p}
                  onClick={() => onSelect(si)}
                  onMouseEnter={() => onHover(p)}
                  onMouseLeave={() => onHover(null)}
                  title={`S${si + 1} × P${p + 1}: backs ${pct(sup)}, contradicts ${pct(con)}, silent ${pct(none)}`}
                  aria-label={`Sentence ${si + 1}, passage ${p + 1}: backs ${pct(sup)}, contradicts ${pct(con)}`}
                  className={`cell-in h-7 rounded-md ${si === selected ? "outline-2 -outline-offset-1 outline-[var(--brand)] outline" : ""} ${
                    judgements[si].verdict === "not_claim" ? "opacity-25" : ""
                  }`}
                  style={{ background: cellColor(sup, con), animationDelay: `${(si * n + p) * 5}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ sentences, passages }: { sentences: number; passages: number }) {
  const total = sentences * passages;
  return (
    <div className="rounded-3xl border border-line bg-card p-6" role="status" aria-live="polite">
      <p className="flex items-center gap-2 font-display text-lg font-bold">
        <Spinner className="size-5 text-brand" /> Checking {total + sentences} Questions…
      </p>
      <div className="mt-5 grid w-max max-w-full gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, passages)}, minmax(0.75rem, 2rem))` }}>
        {Array.from({ length: total }, (_, k) => (
          <div key={k} className="cell-wave h-7 rounded-md bg-line" style={{ animationDelay: `${((k % passages) + Math.floor(k / passages)) * 70}ms` }} />
        ))}
      </div>
    </div>
  );
}
