"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CheckResult, Verdict } from "@/lib/types";
import { judgeAll, type Judgement } from "@/lib/verdict";
import { ConfidenceChart } from "./charts/ConfidenceChart";
import { EvidenceMatrix } from "./charts/EvidenceMatrix";
import { SourceCoverage } from "./charts/SourceCoverage";
import { TipRow, useTooltip } from "./charts/Tooltip";
import { ArrowLeft, ArrowRight, Bolt, ChevronDown, Copy, Download, Info, Spinner } from "./Icons";
import { date, ORDER, pct, prefersReducedMotion, seconds, tokens, usd, VERDICT, VerdictBadge } from "./ui";

interface Props {
  result: CheckResult;
  labels: Verdict[] | null;
  origin: "saved" | "live";
  threshold: number;
  onThreshold: (v: number) => void;
  canRunLive: boolean;
  running: boolean;
  onRunLive: () => void;
  onToast: (message: string) => void;
}

const isIssue = (j: Judgement) => j.verdict === "contradicted" || j.verdict === "unsupported" || (j.verdict === "supported" && j.needsReview);

export function Dashboard(props: Props) {
  const { result, labels, threshold } = props;
  const judgements = useMemo(() => judgeAll(result, threshold), [result, threshold]);
  const issues = judgements.flatMap((j, s) => (isIssue(j) ? [s] : []));
  const [selected, setSelected] = useState(() => issues[0] ?? 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const sentenceEls = useRef<(HTMLSpanElement | null)[]>([]);

  const select = (s: number, scroll = false) => {
    setSelected(s);
    if (scroll) sentenceEls.current[s]?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
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

  // ← → move between sentences, N jumps to the next issue (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [role='slider']") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") select(Math.min(result.sentences.length - 1, selected + 1), true);
      else if (e.key === "ArrowLeft") select(Math.max(0, selected - 1), true);
      else if (e.key === "n" || e.key === "N") step(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function copyReport() {
    const lines = result.sentences.flatMap((s, i) => {
      const j = judgements[i];
      if (j.verdict === "not_claim") return [];
      const p = j.passage !== null ? result.passages[j.passage] : null;
      const src = p && j.verdict !== "unsupported" ? ` (P${p.i + 1}, ${p.doc})` : "";
      return [`| S${i + 1} | ${VERDICT[j.verdict].label} | ${pct(j.confidence)} | ${s.text.replace(/\|/g, "\\|")}${src} |`];
    });
    const text = ["## Hallucinot report", "", `**Question:** ${result.question}`, "", "| # | Verdict | Confidence | Sentence |", "|---|---|---|---|", ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      props.onToast("Report copied as a Markdown table");
    } catch {
      props.onToast("Copy didn't work in this browser. Use Export JSON instead.");
    }
  }

  function exportJson() {
    const data = { ...result, verdicts: judgements.map((j, s) => ({ sentence: s + 1, ...j })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "hallucinot-report.json";
    a.click();
    URL.revokeObjectURL(url);
    props.onToast("Downloaded hallucinot-report.json");
  }

  const agree = labels ? judgements.filter((j, s) => j.verdict === labels[s]).length : null;

  return (
    <div className="fade-up">
      {/* Result header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Results</h3>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {props.origin === "saved" ? `Saved run from ${date(result.meta.createdAt)}` : "Live run, just now"} on{" "}
            <span translate="no">{result.meta.engine}</span>
            {agree !== null && `. Matches human labels on ${agree} of ${labels!.length} sentences.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.canRunLive && (
            <button
              onClick={props.onRunLive}
              disabled={props.running}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-ink disabled:opacity-60"
            >
              {props.running ? <Spinner className="size-4" /> : <Bolt className="size-4" />}
              {props.running ? "Running Live…" : "Run Live Again"}
            </button>
          )}
          <button onClick={copyReport} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-ink">
            <Copy className="size-4" /> Copy Report
          </button>
          <button onClick={exportJson} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-ink">
            <Download className="size-4" /> Export JSON
          </button>
        </div>
      </div>

      <Kpis result={result} judgements={judgements} threshold={threshold} />

      <Board
        result={result}
        judgements={judgements}
        labels={labels}
        selected={selected}
        onSelect={select}
        hovered={hovered}
        onHover={setHovered}
        sentenceEls={sentenceEls}
        issues={issues}
        onStep={step}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Confidence by sentence"
          info="How sure the engine is about each claim's verdict. Verdicts left of the line go to a person for review. Dragging the line re-sorts everything instantly, with no new API calls."
        >
          <ConfidenceChart result={result} judgements={judgements} selected={selected} onSelect={(s) => select(s, true)} threshold={threshold} onThreshold={props.onThreshold} />
        </Panel>
        <Panel
          title="Source coverage"
          info="For each source passage, how many claims it supports or contradicts with at least 50% probability. Unused passages were never relevant to the answer."
        >
          <SourceCoverage result={result} judgements={judgements} hovered={hovered} onHover={setHovered} />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title={`Evidence matrix: all ${result.sentences.length * result.passages.length} checks`}
          info="Each square is one question to the engine: does this passage support, contradict, or say nothing about this sentence? All of them run in parallel."
        >
          <EvidenceMatrix result={result} judgements={judgements} selected={selected} onSelect={(s) => select(s, true)} hovered={hovered} onHover={setHovered} />
        </Panel>
      </div>

      <div className="mt-6">
        <ResultsTable result={result} judgements={judgements} selected={selected} onSelect={(s) => select(s, true)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Panel({ title, info, children }: { title: string; info: string; children: React.ReactNode }) {
  const tip = useTooltip();
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <h4 className="text-[15px] font-semibold">{title}</h4>
        <button
          aria-label={`About ${title}`}
          onPointerMove={(e) => tip.show(e, <p className="max-w-[16rem] text-ink-2">{info}</p>)}
          onPointerLeave={tip.hide}
          onFocus={(e) => tip.show(e, <p className="max-w-[16rem] text-ink-2">{info}</p>)}
          onBlur={tip.hide}
          className="rounded-full text-muted transition-colors hover:text-ink"
        >
          <Info className="size-4" />
        </button>
      </div>
      <p className="sr-only">{info}</p>
      {children}
      {tip.node}
    </section>
  );
}

function Kpis({ result, judgements, threshold }: { result: CheckResult; judgements: Judgement[]; threshold: number }) {
  const count = (v: Verdict) => judgements.filter((j) => j.verdict === v).length;
  const claims = judgements.length - count("not_claim");
  const supported = count("supported");
  const review = judgements.filter((j) => j.needsReview).length;
  const tip = useTooltip();

  const tiles: { label: string; value: string; caption: string; verdict?: Verdict }[] = [
    { label: "Contradicted", value: `${count("contradicted")}`, caption: "claims the sources say are false", verdict: "contradicted" },
    { label: "No source", value: `${count("unsupported")}`, caption: "claims no source mentions", verdict: "unsupported" },
    { label: "Needs review", value: `${review}`, caption: `verdicts below ${pct(threshold)} confidence` },
    { label: "Checks run", value: `${result.meta.questions}`, caption: `in ${seconds(result.meta.ms)}${result.meta.model !== "mock" ? `, ${tokens(result.meta.inputTokens)} tokens, ~${usd(result.meta.listPriceUsd)}` : ""}` },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
      <div className="col-span-2 rounded-xl border border-border bg-surface p-5 lg:col-span-1">
        <p className="text-[13px] text-ink-2">Groundedness</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">{claims ? pct(supported / claims) : "–"}</p>
        <p className="mt-1 text-[13px] text-ink-2">
          {supported} of {claims} claims are supported by the sources
        </p>
        <div className="mt-4 flex h-2.5 gap-[2px]" role="img" aria-label={ORDER.map((v) => `${count(v)} ${VERDICT[v].label}`).join(", ")}>
          {ORDER.map(
            (v) =>
              count(v) > 0 && (
                <span
                  key={v}
                  className="grow-x h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                  style={{ flexGrow: count(v), background: VERDICT[v].color }}
                  onPointerMove={(e) => tip.show(e, <TipRow color={VERDICT[v].color} value={`${count(v)}`} label={VERDICT[v].label.toLowerCase()} />)}
                  onPointerLeave={tip.hide}
                />
              ),
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
          {ORDER.map((v) => (
            <span key={v} className="flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-[2px]" style={{ background: VERDICT[v].color }} />
              {VERDICT[v].label} <span className="tabular-nums text-ink">{count(v)}</span>
            </span>
          ))}
        </div>
        {tip.node}
      </div>
      {tiles.map((t) => {
        const V = t.verdict ? VERDICT[t.verdict] : null;
        return (
          <div key={t.label} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
              {V && <V.Icon className="size-4" />}
              {t.label}
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">{t.value}</p>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-2">{t.caption}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface BoardProps {
  result: CheckResult;
  judgements: Judgement[];
  labels: Verdict[] | null;
  selected: number;
  onSelect: (s: number, scroll?: boolean) => void;
  hovered: number | null;
  onHover: (p: number | null) => void;
  sentenceEls: React.RefObject<(HTMLSpanElement | null)[]>;
  issues: number[];
  onStep: (dir: 1 | -1) => void;
}

const LINK_MIN = 0.35;

function Board({ result, judgements, labels, selected, onSelect, hovered, onHover, sentenceEls, issues, onStep }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const passageEls = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<{ key: string; d: string; color: string; w: number }[]>([]);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const sel = judgements[selected];
  const V = VERDICT[sel.verdict];

  // Connector curves from the selected sentence to each passage that supports or contradicts it.
  // Layout is only read inside effects and animation frames, never during render.
  useLayoutEffect(() => {
    const compute = () => {
      const board = boardRef.current, answer = answerRef.current, sentence = sentenceEls.current[selected];
      if (!board || !answer || !sentence || window.innerWidth < 1024) return setPaths([]);
      const b = board.getBoundingClientRect(), a = answer.getBoundingClientRect();
      const rects = sentence.getClientRects();
      const r = rects[rects.length - 1] ?? sentence.getBoundingClientRect();
      const x0 = a.right - b.left, y0 = Math.min(Math.max(r.top + r.height / 2, a.top + 12), a.bottom - 12) - b.top;
      const out: typeof paths = [];
      result.cells[selected].forEach(([sup, con], p) => {
        const strength = Math.max(sup, con), el = passageEls.current[p];
        if (strength < LINK_MIN || !el) return;
        const pr = el.getBoundingClientRect();
        const x1 = pr.left - b.left, y1 = pr.top + 22 - b.top, mx = (x0 + x1) / 2;
        out.push({ key: `${selected}-${p}`, d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`, color: con > sup ? "var(--refuted)" : "var(--supported)", w: 1 + strength * 1.5 });
      });
      setPaths(out);
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
    <div ref={boardRef} className="relative mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:gap-0">
      <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block" aria-hidden>
        {paths.map((p) => (
          <path key={p.key} d={p.d} pathLength={1} fill="none" stroke={p.color} strokeWidth={p.w} strokeLinecap="round" className="connector" />
        ))}
      </svg>

      {/* Answer */}
      <section ref={answerRef} className="rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold">Answer, sentence by sentence</h4>
          <div className="flex items-center gap-1 text-[13px] text-ink-2">
            <button aria-label="Previous issue" onClick={() => onStep(-1)} disabled={!issues.length} className="grid size-7 place-items-center rounded-md transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40">
              <ArrowLeft className="size-4" />
            </button>
            <span className="min-w-[6.5rem] text-center tabular-nums" aria-live="polite">
              {issues.length ? `Issue ${Math.max(1, issues.indexOf(selected) + 1)} of ${issues.length}` : "No issues"}
            </span>
            <button aria-label="Next issue" onClick={() => onStep(1)} disabled={!issues.length} className="grid size-7 place-items-center rounded-md transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40">
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-b border-hairline pb-3 text-[12px]">
          {(["supported", "contradicted", "unsupported", "not_claim"] as Verdict[]).map((v) => (
            <span key={v} className="flex items-center gap-1.5 text-ink-2">
              <span className={`${VERDICT[v].mark} px-1.5 text-[11px] leading-4`}>{v === "not_claim" ? "Aa" : "Aa"}</span>
              {VERDICT[v].label}
            </span>
          ))}
        </div>

        <p className="mt-4 rounded-lg bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink-2">
          <span className="font-medium text-ink">User asked: </span>
          {result.question}
        </p>

        <p className="mt-4 break-words text-[16px] leading-[1.95]">
          {result.sentences.map((s, i) => {
            const j = judgements[i];
            const dim = hovered !== null && Math.max(result.cells[i][hovered][0], result.cells[i][hovered][1]) < 0.5;
            return (
              <span key={i}>
                {/* Inline span (not <button>) so the highlight can wrap across lines; keyboard handled below. */}
                <span
                  ref={(el) => {
                    sentenceEls.current[i] = el;
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={i === selected}
                  aria-label={`Sentence ${i + 1}, ${VERDICT[j.verdict].label}: ${s.text}`}
                  onClick={() => onSelect(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(i);
                    }
                  }}
                  className={`${VERDICT[j.verdict].mark} sweep cursor-pointer transition-[opacity,box-shadow] duration-150 ${
                    i === selected ? "shadow-[0_0_0_2px_var(--ink)]" : "hover:shadow-[0_0_0_1px_var(--hairline)]"
                  } ${dim ? "opacity-30" : ""}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {s.text}
                </span>
                {j.needsReview && (
                  <sup className="ml-0.5 text-[11px] font-semibold text-ink" title="Below the review line">
                    review
                  </sup>
                )}
                {labels && labels[i] !== j.verdict && (
                  <sup className="ml-0.5 text-[11px] text-muted" title={`A human labelled this ${VERDICT[labels[i]].label.toLowerCase()}`}>
                    ≠ label
                  </sup>
                )}{" "}
              </span>
            );
          })}
        </p>
        <p className="mt-4 hidden text-[12px] text-muted lg:block">
          Click a sentence to see its evidence. Keys: <Kbd>←</Kbd> <Kbd>→</Kbd> move, <Kbd>N</Kbd> next issue.
        </p>
      </section>

      <div className="hidden lg:block" />

      {/* Evidence */}
      <section className="rounded-xl border border-border bg-surface p-5" aria-live="polite">
        <h4 className="text-[15px] font-semibold">Evidence for sentence {selected + 1}</h4>
        <div className="mt-3 rounded-lg p-4" style={{ background: V.soft }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <VerdictBadge verdict={sel.verdict} className="text-[15px] font-semibold" />
            {sel.needsReview && <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium">Needs human review</span>}
          </div>
          <p className="mt-1.5 text-[14px] text-ink-2">{V.reason}</p>
          {sel.verdict !== "not_claim" && (
            <div className="mt-3 flex items-center gap-3 text-[13px]">
              <span className="text-ink-2">Confidence</span>
              <div
                role="meter"
                aria-label="Engine confidence"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sel.confidence * 100)}
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface"
              >
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${sel.confidence * 100}%`, background: V.color }} />
              </div>
              <span className="w-10 text-right font-semibold">{pct(sel.confidence)}</span>
            </div>
          )}
        </div>

        <p className="mt-5 text-[13px] text-ink-2">How each source passage relates to this sentence</p>
        <div className="mt-2 space-y-2">
          {result.passages.map((p) => {
            const [sup, con, none] = result.cells[selected][p.i];
            const rel = con > sup && con >= LINK_MIN ? "contradicted" : sup >= LINK_MIN ? "supported" : null;
            const open = rel !== null || opened.has(p.i);
            return (
              <div
                key={p.i}
                ref={(el) => {
                  passageEls.current[p.i] = el;
                }}
                onMouseEnter={() => onHover(p.i)}
                onMouseLeave={() => onHover(null)}
                className={`rounded-lg border transition-colors ${rel ? "border-ink/25 bg-surface" : "border-hairline"} ${hovered === p.i ? "border-ink/40" : ""}`}
              >
                <button
                  onClick={() =>
                    setOpened((o) => {
                      const next = new Set(o);
                      if (next.has(p.i)) next.delete(p.i);
                      else next.add(p.i);
                      return next;
                    })
                  }
                  disabled={rel !== null}
                  aria-expanded={open}
                  className="flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left disabled:cursor-default"
                >
                  <span className="w-6 shrink-0 text-[12px] font-semibold tabular-nums">P{p.i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink-2">{p.doc}</span>
                    <ProbBar sup={sup} con={con} none={none} />
                  </span>
                  <span className="w-28 shrink-0 text-right text-[12px]">
                    {rel ? <VerdictBadge verdict={rel} className="justify-end" /> : <span className="text-muted">Says nothing</span>}
                    <span className="block tabular-nums text-ink-2">{pct(rel === "contradicted" ? con : rel === "supported" ? sup : none)}</span>
                  </span>
                  {!rel && <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />}
                </button>
                {open && <p className="fade-up border-t border-hairline px-3.5 py-3 text-[14px] leading-relaxed">{p.text}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ProbBar({ sup, con, none }: { sup: number; con: number; none: number }) {
  const parts = [
    { v: sup, c: "var(--supported)" },
    { v: none, c: "var(--neutral)" },
    { v: con, c: "var(--refuted)" },
  ].filter((p) => p.v >= 0.01);
  return (
    <span className="mt-1.5 flex h-1.5 gap-[2px] overflow-hidden rounded-full" aria-hidden>
      {parts.map((p, i) => (
        <span key={i} className="h-full transition-[flex-grow] duration-300" style={{ flexGrow: p.v, background: p.c }} />
      ))}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border bg-surface-2 px-1 text-[11px] text-ink">{children}</kbd>;
}

// ---------------------------------------------------------------------------

function ResultsTable({ result, judgements, selected, onSelect }: { result: CheckResult; judgements: Judgement[]; selected: number; onSelect: (s: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-border bg-surface">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="results-table" className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="text-[15px] font-semibold">All sentences as a table</span>
        <span className="flex items-center gap-1.5 text-[13px] text-ink-2">
          {open ? "Hide" : "Show"} <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div id="results-table" className="overflow-x-auto border-t border-hairline">
          <table className="w-full min-w-[44rem] text-left text-[13px]">
            <thead className="text-[12px] text-ink-2">
              <tr className="border-b border-hairline">
                <th className="px-5 py-2.5 font-medium">#</th>
                <th className="py-2.5 pr-4 font-medium">Sentence</th>
                <th className="py-2.5 pr-4 font-medium">Verdict</th>
                <th className="py-2.5 pr-4 text-right font-medium">Confidence</th>
                <th className="py-2.5 pr-4 font-medium">Strongest source</th>
                <th className="py-2.5 pr-5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.sentences.map((s, i) => {
                const j = judgements[i];
                const p = j.passage !== null && j.verdict !== "unsupported" && j.verdict !== "not_claim" ? result.passages[j.passage] : null;
                return (
                  <tr
                    key={i}
                    onClick={() => onSelect(i)}
                    aria-selected={i === selected}
                    className={`cursor-pointer border-b border-hairline last:border-0 transition-colors hover:bg-surface-2 ${i === selected ? "bg-surface-2" : ""}`}
                  >
                    <td className="px-5 py-2.5 tabular-nums text-muted">S{i + 1}</td>
                    <td className="max-w-[24rem] py-2.5 pr-4">{s.text}</td>
                    <td className="py-2.5 pr-4">
                      <VerdictBadge verdict={j.verdict} />
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{j.verdict === "not_claim" ? "–" : pct(j.confidence)}</td>
                    <td className="py-2.5 pr-4 text-ink-2">{p ? `P${p.i + 1}, ${p.doc}` : "–"}</td>
                    <td className="py-2.5 pr-5 text-ink-2">{j.verdict === "not_claim" ? "Skipped" : j.needsReview ? "Needs review" : "Auto-accepted"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
