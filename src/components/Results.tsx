"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CheckResult, Verdict } from "@/lib/types";
import { judgeAll, VERDICT_LABEL, type Judgement } from "@/lib/verdict";
import { cellColor, pct, seconds, tokens, usd, VERDICT_STYLE } from "./ui";

interface Props {
  result: CheckResult;
  labels: Verdict[] | null;
  origin: "saved" | "live";
  autoAccept: number;
  onAutoAccept: (v: number) => void;
}

export function Results({ result, labels, origin, autoAccept, onAutoAccept }: Props) {
  const judgements = useMemo(() => judgeAll(result, autoAccept), [result, autoAccept]);
  const firstProblem = judgements.findIndex((j) => j.verdict === "contradicted" || j.verdict === "unsupported");
  const [selected, setSelected] = useState(firstProblem >= 0 ? firstProblem : 0);
  const [hoveredPassage, setHoveredPassage] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ReceiptCard result={result} judgements={judgements} origin={origin} />
        <ControlPanel
          result={result}
          judgements={judgements}
          labels={labels}
          autoAccept={autoAccept}
          onAutoAccept={onAutoAccept}
          onSelect={setSelected}
        />
      </div>

      <EvidenceBoard
        result={result}
        judgements={judgements}
        labels={labels}
        selected={selected}
        onSelect={setSelected}
        hoveredPassage={hoveredPassage}
        onHoverPassage={setHoveredPassage}
      />

      <Matrix
        result={result}
        judgements={judgements}
        selected={selected}
        onSelect={setSelected}
        hoveredPassage={hoveredPassage}
        onHoverPassage={setHoveredPassage}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReceiptCard({ result, judgements, origin }: { result: CheckResult; judgements: Judgement[]; origin: "saved" | "live" }) {
  const count = (v: Verdict) => judgements.filter((j) => j.verdict === v).length;
  const claims = judgements.length - count("not_claim");
  const grounded = claims ? count("supported") / claims : 0;
  const { meta } = result;
  const isMock = meta.model === "mock";

  const Row = ({ k, v, className = "" }: { k: string; v: string; className?: string }) => (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span>{k}</span>
      <span className="flex-1 translate-y-[-3px] border-b border-dotted border-line" />
      <span className="tabular-nums">{v}</span>
    </div>
  );

  return (
    <div className="self-start">
      <div className="rounded-t-md bg-surface px-5 pb-5 pt-5 font-mono text-[12.5px] leading-6 shadow-sm">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.3em] text-muted">RECEIPT</div>
          <div className="mt-1 text-[11px] text-muted">
            {origin === "saved" ? "saved run" : "live run"} · {new Date(meta.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="my-3 border-t border-dashed border-line" />
        <Row k="Claims checked" v={`${claims}`} />
        <Row k="Has a receipt" v={`${count("supported")}`} className="text-ok" />
        <Row k="Contradicted" v={`${count("contradicted")}`} className="text-bad" />
        <Row k="No receipt" v={`${count("unsupported")}`} className="text-warn" />
        <Row k="Filler skipped" v={`${count("not_claim")}`} className="text-muted" />
        <div className="my-3 border-t border-dashed border-line" />
        <Row k="Questions asked" v={`${meta.questions}`} />
        <Row k="API calls" v={`${meta.calls} parallel`} />
        <Row k="Wall time" v={seconds(meta.ms)} />
        {!isMock && <Row k="Input tokens" v={tokens(meta.inputTokens)} />}
        {!isMock && <Row k="Cost at Jev price" v={usd(meta.listPriceUsd)} />}
        <div className="my-3 border-t border-dashed border-line" />
        <div className="flex items-baseline justify-between text-[13px] font-semibold">
          <span>GROUNDEDNESS</span>
          <span className={`text-2xl tabular-nums ${grounded >= 0.8 ? "text-ok" : grounded >= 0.5 ? "text-warn" : "text-bad"}`}>{pct(grounded)}</span>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2">
          {(["supported", "contradicted", "unsupported"] as Verdict[]).map((v) => (
            <div key={v} className={VERDICT_STYLE[v].dot} style={{ width: `${claims ? (count(v) / claims) * 100 : 0}%` }} />
          ))}
        </div>
        <div className="mt-3 text-center text-[11px] text-muted">
          engine: {meta.engine}
          <br />
          model: {meta.model}
        </div>
      </div>
      <div className="receipt-edge bg-surface" />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ControlPanel({
  result,
  judgements,
  labels,
  autoAccept,
  onAutoAccept,
  onSelect,
}: {
  result: CheckResult;
  judgements: Judgement[];
  labels: Verdict[] | null;
  autoAccept: number;
  onAutoAccept: (v: number) => void;
  onSelect: (s: number) => void;
}) {
  const review = judgements.map((j, s) => ({ j, s })).filter(({ j }) => j.needsReview);
  const agree = labels ? judgements.filter((j, s) => j.verdict === labels[s]).length : 0;

  return (
    <div className="flex flex-col gap-5 rounded-md border border-line bg-surface p-5">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="auto-accept" className="text-sm font-medium">
            Auto-accept a verdict when the engine is at least <span className="font-mono text-accent">{pct(autoAccept)}</span> sure
          </label>
          <span className="text-xs text-muted">Below that, a person checks it.</span>
        </div>
        <input
          id="auto-accept"
          type="range"
          min={0.5}
          max={0.99}
          step={0.01}
          value={autoAccept}
          onChange={(e) => onAutoAccept(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--accent)]"
        />
        <p className="mt-1 text-xs text-muted">
          Jev returns a probability for every option, so the threshold lives in your code, not in a prompt. Drag it and the board re-routes instantly, with no new API calls.
        </p>
      </div>

      <div>
        <div className="text-sm font-medium">
          Human review queue <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs">{review.length}</span>
        </div>
        {review.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Every verdict clears the threshold. Nothing needs a person.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {review.map(({ j, s }) => (
              <li key={s}>
                <button
                  onClick={() => onSelect(s)}
                  className="flex w-full items-start gap-2 rounded px-2 py-1 text-left text-sm hover:bg-surface-2"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${VERDICT_STYLE[j.verdict].dot}`} />
                  <span className="font-mono text-xs text-muted">S{s + 1}</span>
                  <span className="line-clamp-1 flex-1">{result.sentences[s].text}</span>
                  <span className="font-mono text-xs text-muted">{pct(j.confidence)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {labels && (
        <div className="rounded border border-dashed border-line px-3 py-2 text-sm">
          <span className="font-medium">Eval: </span>
          the engine agrees with the hand labels on{" "}
          <span className="font-mono">
            {agree}/{labels.length}
          </span>{" "}
          sentences. A <span className="font-mono text-accent">≠</span> marks each disagreement on the board.
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {(Object.keys(VERDICT_LABEL) as Verdict[]).map((v) => (
          <span key={v} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${VERDICT_STYLE[v].dot}`} /> {VERDICT_LABEL[v]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-b-2 border-dashed border-muted" /> needs review
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface BoardProps {
  result: CheckResult;
  judgements: Judgement[];
  labels?: Verdict[] | null;
  selected: number;
  onSelect: (s: number) => void;
  hoveredPassage: number | null;
  onHoverPassage: (p: number | null) => void;
}

const LINK_MIN = 0.35;

function EvidenceBoard({ result, judgements, labels, selected, onSelect, hoveredPassage, onHoverPassage }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const sentenceEls = useRef<(HTMLSpanElement | null)[]>([]);
  const passageEls = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<{ key: string; d: string; color: string; w: number; o: number }[]>([]);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  // Draw curves from the selected sentence to every passage that backs or refutes it.
  useLayoutEffect(() => {
    const compute = () => {
      const board = boardRef.current;
      const answer = answerRef.current;
      const sentence = sentenceEls.current[selected];
      if (!board || !answer || !sentence || window.innerWidth < 1024) {
        setPaths([]);
        setOrigin(null);
        return;
      }
      const b = board.getBoundingClientRect();
      const a = answer.getBoundingClientRect();
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
        const y1 = pr.top + Math.min(26, pr.height / 2) - b.top;
        const mx = (x0 + x1) / 2;
        out.push({
          key: `${selected}-${p}`,
          d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`,
          color: con > sup ? "var(--bad)" : "var(--ok)",
          w: 1 + strength * 2.5,
          o: 0.3 + strength * 0.65,
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
  }, [selected, result]);

  const sel = judgements[selected];
  const selStyle = VERDICT_STYLE[sel.verdict];

  return (
    <div ref={boardRef} className="relative grid gap-6 lg:grid-cols-[minmax(0,5fr)_64px_minmax(0,6fr)] lg:gap-0">
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block" aria-hidden>
        {paths.map((p) => (
          <path key={p.key} d={p.d} pathLength={1} fill="none" stroke={p.color} strokeWidth={p.w} strokeOpacity={p.o} strokeLinecap="round" className="connector" />
        ))}
        {origin && paths.length > 0 && <circle cx={origin.x} cy={origin.y} r={4} fill={selStyle.color} />}
      </svg>

      {/* Answer column */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div ref={answerRef} className="rounded-md border border-line bg-surface p-5">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">The question</div>
          <p className="mb-4 text-sm text-muted">{result.question}</p>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">AI answer · click any sentence</div>
          <p className="text-[15.5px] leading-[1.95]">
            {result.sentences.map((s, i) => {
              const j = judgements[i];
              const st = VERDICT_STYLE[j.verdict];
              const isSel = i === selected;
              const dim =
                hoveredPassage !== null && Math.max(result.cells[i][hoveredPassage][0], result.cells[i][hoveredPassage][1]) < 0.5;
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
                    aria-label={`Sentence ${i + 1}: ${VERDICT_LABEL[j.verdict]}`}
                    onClick={() => onSelect(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(i);
                      }
                    }}
                    className={[
                      "cursor-pointer rounded-[3px] px-0.5 py-0.5 transition-[opacity,box-shadow] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
                      j.verdict === "not_claim" ? "text-muted" : `${st.soft} border-b-2 ${st.border}`,
                      j.needsReview ? "border-dashed" : "",
                      isSel ? "shadow-[0_0_0_2px_var(--accent)]" : "",
                      dim ? "opacity-35" : "",
                    ].join(" ")}
                  >
                    {s.text}
                    <sup className="ml-0.5 font-mono text-[10px] text-muted">{i + 1}</sup>
                    {mismatch && (
                      <sup className="ml-0.5 font-mono text-[11px] font-bold text-accent" title={`Hand label: ${VERDICT_LABEL[labels![i]]}`}>
                        ≠
                      </sup>
                    )}
                  </span>{" "}
                </span>
              );
            })}
          </p>
        </div>

        <SentenceDetail result={result} judgement={sel} s={selected} label={labels?.[selected] ?? null} />
      </div>

      <div className="hidden lg:block" />

      {/* Sources column */}
      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">
          Sources · {result.passages.length} passages, each checked against every sentence
        </div>
        {result.passages.map((p) => {
          const [sup, con, none] = result.cells[selected][p.i];
          const rel = con > sup && con >= LINK_MIN ? "contradicts" : sup >= LINK_MIN ? "supports" : null;
          const isDecisive = sel.passage === p.i && sel.verdict !== "unsupported";
          return (
            <div
              key={p.i}
              ref={(el) => {
                passageEls.current[p.i] = el;
              }}
              onMouseEnter={() => onHoverPassage(p.i)}
              onMouseLeave={() => onHoverPassage(null)}
              className={[
                "rounded-md border bg-surface p-4 transition-[opacity,border-color]",
                rel === "supports" ? "border-ok" : rel === "contradicts" ? "border-bad" : "border-line",
                rel ? "" : "opacity-60",
                isDecisive ? "border-2" : "",
              ].join(" ")}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate">
                  <span className="font-mono font-semibold">P{p.i + 1}</span>
                  <span className="text-muted"> · {p.doc}</span>
                </span>
                <span className={`shrink-0 font-mono ${rel === "supports" ? "text-ok" : rel === "contradicts" ? "text-bad" : "text-muted"}`}>
                  {rel === "supports" ? `supports ${pct(sup)}` : rel === "contradicts" ? `contradicts ${pct(con)}` : `says nothing ${pct(none)}`}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{p.text}</p>
              <ProbBar sup={sup} con={con} none={none} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProbBar({ sup, con, none }: { sup: number; con: number; none: number }) {
  return (
    <div
      className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-2"
      title={`supports ${pct(sup)} · contradicts ${pct(con)} · says nothing ${pct(none)}`}
    >
      <div className="bg-ok transition-[width] duration-300" style={{ width: `${sup * 100}%` }} />
      <div className="bg-bad transition-[width] duration-300" style={{ width: `${con * 100}%` }} />
      <div className="bg-idle/40 transition-[width] duration-300" style={{ width: `${none * 100}%` }} />
    </div>
  );
}

function SentenceDetail({ result, judgement, s, label }: { result: CheckResult; judgement: Judgement; s: number; label: Verdict | null }) {
  const st = VERDICT_STYLE[judgement.verdict];
  const passage = judgement.passage !== null ? result.passages[judgement.passage] : null;
  const explain: Record<Verdict, string> = {
    supported: "A source passage states this or directly implies it.",
    contradicted: "A source passage says the opposite. This is a hallucination that could mislead a user.",
    unsupported: "No passage backs this up or refutes it. The model may have made it up.",
    not_claim: "Greeting or filler, so there is nothing to fact-check.",
  };

  return (
    <div className={`mt-4 rounded-md border-l-4 ${st.border} bg-surface p-4 text-sm`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted">S{s + 1}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.soft} ${st.text}`}>{VERDICT_LABEL[judgement.verdict]}</span>
        <span className="font-mono text-xs text-muted">{pct(judgement.confidence)} confident</span>
        {judgement.needsReview && <span className="rounded-full border border-dashed border-muted px-2 py-0.5 text-xs text-muted">needs review</span>}
      </div>
      <p className="mt-2 text-muted">{explain[judgement.verdict]}</p>
      {passage && judgement.verdict !== "not_claim" && (
        <blockquote className="mt-3 border-l-2 border-line pl-3 text-[13px] leading-relaxed">
          <span className="font-mono text-xs text-muted">
            {judgement.verdict === "unsupported" ? "Closest passage" : "Receipt"} · P{passage.i + 1} · {passage.doc}
          </span>
          <br />
          {passage.text}
        </blockquote>
      )}
      {label && (
        <p className="mt-3 text-xs text-muted">
          Hand label: <span className={VERDICT_STYLE[label].text}>{VERDICT_LABEL[label]}</span>{" "}
          {label === judgement.verdict ? "· engine agrees" : <span className="text-accent">· engine disagrees</span>}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Matrix({ result, judgements, selected, onSelect, hoveredPassage, onHoverPassage }: BoardProps) {
  const n = result.passages.length;
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Evidence matrix</h3>
        <span className="text-xs text-muted">
          {result.sentences.length} sentences × {n} passages = {result.sentences.length * n} independent questions, answered in parallel
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Each cell is one typed question: does passage P support, contradict, or say nothing about sentence S? Green means supports and red means contradicts. Darker is more probable.
      </p>
      <div className="mt-4 overflow-x-auto">
        <div className="grid w-max gap-[3px]" style={{ gridTemplateColumns: `2.75rem repeat(${n}, clamp(22px, calc((100vw - 10rem) / ${n}), 44px))` }}>
          <div />
          {result.passages.map((p) => (
            <div
              key={p.i}
              className={`pb-1 text-center font-mono text-[10px] ${hoveredPassage === p.i ? "font-bold text-ink" : "text-muted"}`}
            >
              P{p.i + 1}
            </div>
          ))}
          {result.sentences.map((s, si) => {
            const st = VERDICT_STYLE[judgements[si].verdict];
            return (
              <div key={si} className="contents">
                <button
                  onClick={() => onSelect(si)}
                  className={`flex items-center gap-1.5 pr-1 font-mono text-[10px] ${si === selected ? "font-bold text-ink" : "text-muted"}`}
                >
                  <span className={`size-2 rounded-full ${st.dot}`} />S{si + 1}
                </button>
                {result.cells[si].map(([sup, con, none], p) => (
                  <button
                    key={p}
                    onClick={() => onSelect(si)}
                    onMouseEnter={() => onHoverPassage(p)}
                    onMouseLeave={() => onHoverPassage(null)}
                    title={`S${si + 1} × P${p + 1}: supports ${pct(sup)} · contradicts ${pct(con)} · says nothing ${pct(none)}`}
                    aria-label={`Sentence ${si + 1}, passage ${p + 1}: supports ${pct(sup)}, contradicts ${pct(con)}`}
                    className={[
                      "cell-in h-[22px] rounded-[3px]",
                      si === selected ? "outline outline-1 outline-[var(--accent)]" : "",
                      hoveredPassage === p ? "brightness-110" : "",
                      judgements[si].verdict === "not_claim" ? "opacity-30" : "",
                    ].join(" ")}
                    style={{ background: cellColor(sup, con), animationDelay: `${(si * n + p) * 6}ms` }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MatrixSkeleton({ sentences, passages }: { sentences: number; passages: number }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <div className="text-sm font-semibold">
        Asking {sentences * passages + sentences} questions in parallel…
      </div>
      <p className="mt-1 text-xs text-muted">
        One call per source passage. Every sentence is its own typed question inside that call.
      </p>
      <div className="mt-4 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, passages)}, minmax(14px, 1fr))` }}>
        {Array.from({ length: sentences * passages }, (_, k) => (
          <div
            key={k}
            className="cell-wave h-[22px] rounded-[3px] bg-surface-2"
            style={{ animationDelay: `${((k % passages) + Math.floor(k / passages)) * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
