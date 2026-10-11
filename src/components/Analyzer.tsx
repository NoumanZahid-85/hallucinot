"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckResult, Demo } from "@/lib/types";
import { LIMITS, splitPassages, splitSentences } from "@/lib/split";
import { Dashboard } from "./Dashboard";
import { Bolt, Briefcase, ChevronDown, Headset, Pencil, Spinner, Telescope } from "./Icons";
import { prefersReducedMotion } from "./ui";

type Inputs = { question: string; answer: string; sources: string };
type Run = { result: CheckResult; origin: "saved" | "live"; inputs: string };
const OWN = "own";
const EMPTY: Inputs = { question: "", answer: "", sources: "" };
const SAMPLE: Inputs = {
  question: "Where is the Eiffel Tower, and when was it built?",
  answer: "The Eiffel Tower is in Berlin. It was completed in 1889 for the World's Fair. It is the tallest building in Europe. Hope that helps!",
  sources:
    "# Eiffel Tower\nThe Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.\n\nIt was completed in 1889 as the centrepiece of the 1889 World's Fair.",
};
const ICONS: Record<string, typeof Headset> = { "support-bot": Headset, webb: Telescope, "hr-policy": Briefcase, [OWN]: Pencil };

interface Props {
  demos: Demo[];
  saved: Record<string, CheckResult>;
  engine: { label: string; configured: boolean };
}

export function Analyzer({ demos, saved, engine }: Props) {
  const original = (d: Demo): Inputs => ({ question: d.question, answer: d.answer, sources: d.sources });
  const [tab, setTab] = useState(demos[0].id);
  const [inputs, setInputs] = useState<Record<string, Inputs>>(() => Object.fromEntries([...demos.map((d) => [d.id, original(d)]), [OWN, EMPTY]]));
  const [runs, setRuns] = useState<Record<string, Run>>(() =>
    Object.fromEntries(demos.filter((d) => saved[d.id]).map((d) => [d.id, { result: saved[d.id], origin: "saved" as const, inputs: JSON.stringify(original(d)) }])),
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<{ tab: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Inputs, string>>>({});
  const [threshold, setThreshold] = useState(0.8);
  const [showSources, setShowSources] = useState(false);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const sourcesRef = useRef<HTMLTextAreaElement>(null);

  const demo = demos.find((d) => d.id === tab) ?? null;
  const current = inputs[tab];
  const run = runs[tab];
  const own = inputs[OWN];
  const ownDirty = !!(own.answer || own.sources) && runs[OWN]?.inputs !== JSON.stringify(own);
  const labels = demo && run && run.result.sentences.length === demo.labels.length ? demo.labels : null;
  const nS = splitSentences(current.answer).length;
  const passages = splitPassages(current.sources);
  const docs = Array.from(new Set(passages.map((p) => p.doc)));

  // The chosen input lives in the URL (?example=webb) so a view can be shared.
  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search).get("example");
      if (q && (q === OWN || demos.some((d) => d.id === q))) setTab(q);
    };
    read();
    window.addEventListener("analyzer:select", read);
    return () => window.removeEventListener("analyzer:select", read);
  }, [demos]);

  // Warn before leaving with pasted text that hasn't been analyzed.
  useEffect(() => {
    if (!ownDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [ownDirty]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const scrollTo = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  function choose(id: string) {
    setTab(id);
    setError(null);
    setFieldErrors({});
    setShowSources(false);
    const url = new URL(window.location.href);
    url.searchParams.set("example", id);
    window.history.replaceState(null, "", url);
  }

  async function analyze(forTab = tab) {
    const body = inputs[forTab];
    if (forTab === OWN) {
      const errs: Partial<Record<keyof Inputs, string>> = {};
      const s = splitSentences(body.answer).length, p = splitPassages(body.sources).length;
      if (!s) errs.answer = "Paste the AI answer you want to check.";
      else if (body.answer.length > LIMITS.answerChars || s > LIMITS.sentences) errs.answer = `Shorten the answer to ${LIMITS.sentences} sentences or fewer.`;
      if (!p) errs.sources = "Paste at least one source passage.";
      else if (body.sources.length > LIMITS.sourceChars || p > LIMITS.passages) errs.sources = `Shorten the sources to ${LIMITS.passages} passages or fewer.`;
      setFieldErrors(errs);
      if (errs.answer) return answerRef.current?.focus();
      if (errs.sources) return sourcesRef.current?.focus();
    }
    setLoading(forTab);
    setError(null);
    if (!runs[forTab]) requestAnimationFrame(() => scrollTo(resultsRef.current));
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `The analysis failed (status ${res.status}). Try again in a moment.`);
      setRuns((r) => ({ ...r, [forTab]: { result: data as CheckResult, origin: "live", inputs: JSON.stringify(body) } }));
      requestAnimationFrame(() => scrollTo(resultsRef.current));
    } catch (e) {
      setError({ tab: forTab, message: e instanceof Error ? e.message : "The analysis didn't finish. Try again in a moment." });
    } finally {
      setLoading(null);
    }
  }

  const update = (field: keyof Inputs, value: string) => {
    setInputs((all) => ({ ...all, [OWN]: { ...all[OWN], [field]: value } }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: undefined }));
  };
  const ctrlEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      analyze();
    }
  };

  return (
    <section id="analyzer" className="scroll-mt-6" aria-labelledby="analyzer-title">
      <div className="max-w-2xl">
        <h2 id="analyzer-title" className="font-serif text-5xl tracking-tight text-balance">
          Analyzer
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-2 text-pretty">
          Choose an example or paste your own answer. Examples open with a saved analysis. A live run takes about three seconds.
        </p>
      </div>

      {/* Input */}
      <div className="mt-8 grid overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="border-b border-hairline p-3 lg:border-b-0 lg:border-r" role="radiogroup" aria-label="What to analyze">
          <p className="px-2 pb-2 pt-1 text-[12px] font-medium text-ink-2">1. Choose an input</p>
          {[...demos.map((d) => ({ id: d.id, title: d.label, sub: d.blurb, meta: `${splitSentences(d.answer).length} sentences, ${splitPassages(d.sources).length} passages` })), { id: OWN, title: "Your own answer", sub: "Paste any answer and its sources", meta: "Live analysis" }].map((o) => {
            const Icon = ICONS[o.id] ?? Pencil;
            const on = tab === o.id;
            return (
              <button
                key={o.id}
                role="radio"
                aria-checked={on}
                onClick={() => choose(o.id)}
                className={`relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${on ? "bg-surface-2" : "hover:bg-surface-2/60"}`}
              >
                {on && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-ink" aria-hidden />}
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border ${on ? "border-ink bg-ink text-page" : "border-border text-ink-2"}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{o.title}</span>
                  <span className="block text-[12.5px] text-ink-2">{o.sub}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted">{o.meta}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          {demo ? (
            <div key={tab} className="fade-up">
              <p className="text-[12px] font-medium text-ink-2">2. Review what will be checked</p>
              <dl className="mt-3 space-y-4">
                <div>
                  <dt className="text-[12px] text-muted">The user asked</dt>
                  <dd className="mt-1 text-[15px]">{current.question}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted">The AI answered ({nS} sentences)</dt>
                  <dd className="mt-1 border-l-2 border-hairline pl-3.5 text-[15px] leading-relaxed text-ink-2">{current.answer}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted">Against these sources</dt>
                  <dd className="mt-1">
                    <button onClick={() => setShowSources((v) => !v)} aria-expanded={showSources} className="flex items-center gap-1.5 text-[14px] font-medium transition-colors hover:text-ink-2">
                      {passages.length} passages from {docs.length} documents
                      <ChevronDown className={`size-4 transition-transform ${showSources ? "rotate-180" : ""}`} />
                    </button>
                    {showSources && (
                      <ol className="fade-up mt-2 space-y-2">
                        {passages.map((p) => (
                          <li key={p.i} className="rounded-lg bg-surface-2 px-3 py-2 text-[13.5px] leading-relaxed">
                            <span className="mr-1.5 font-semibold tabular-nums">P{p.i + 1}</span>
                            <span className="text-ink-2">{p.doc}: </span>
                            {p.text}
                          </li>
                        ))}
                      </ol>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="fade-up">
              <p className="text-[12px] font-medium text-ink-2">2. Paste an answer and its sources</p>
              <div className="mt-3 space-y-4">
                <Field label="The user asked" hint="Optional">
                  <input
                    name="question"
                    autoComplete="off"
                    value={own.question}
                    onChange={(e) => update("question", e.target.value)}
                    onKeyDown={ctrlEnter}
                    placeholder="Where is the Eiffel Tower?…"
                    className="w-full rounded-lg border border-border bg-page px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-focus"
                  />
                </Field>
                <div className="grid gap-4 xl:grid-cols-2">
                  <Field label="The AI answered" hint={`${splitSentences(own.answer).length} of ${LIMITS.sentences} sentences`} error={fieldErrors.answer} id="answer">
                    <textarea
                      ref={answerRef}
                      name="answer"
                      autoComplete="off"
                      rows={7}
                      value={own.answer}
                      onChange={(e) => update("answer", e.target.value)}
                      onKeyDown={ctrlEnter}
                      aria-invalid={!!fieldErrors.answer}
                      aria-describedby={fieldErrors.answer ? "answer-error" : undefined}
                      placeholder="Paste the chatbot’s answer…"
                      className="w-full resize-y rounded-lg border border-border bg-page px-3.5 py-2.5 text-[15px] leading-relaxed outline-none transition-colors focus:border-focus aria-[invalid=true]:border-refuted"
                    />
                  </Field>
                  <Field label="Against these sources" hint={`${splitPassages(own.sources).length} of ${LIMITS.passages} passages`} error={fieldErrors.sources} id="sources">
                    <textarea
                      ref={sourcesRef}
                      name="sources"
                      autoComplete="off"
                      rows={7}
                      value={own.sources}
                      onChange={(e) => update("sources", e.target.value)}
                      onKeyDown={ctrlEnter}
                      aria-invalid={!!fieldErrors.sources}
                      aria-describedby={fieldErrors.sources ? "sources-error" : "sources-help"}
                      placeholder={"# Refund policy\nPaste the documents the answer should be based on…"}
                      className="w-full resize-y rounded-lg border border-border bg-page px-3.5 py-2.5 text-[15px] leading-relaxed outline-none transition-colors focus:border-focus aria-[invalid=true]:border-refuted"
                    />
                  </Field>
                </div>
                <p id="sources-help" className="text-[12px] text-muted">
                  Start each document with a line like “# Refund policy”. A blank line starts a new passage.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <p className="text-[13px] text-ink-2">
              {demo
                ? run?.origin === "saved"
                  ? "A saved analysis is shown below. Run it live to call the engine now."
                  : "Showing your latest live run."
                : `${nS * passages.length + nS} checks in ${passages.length + 1} parallel calls.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {!demo && (
                <>
                  <button onClick={() => setInputs((all) => ({ ...all, [OWN]: SAMPLE }))} className="rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors hover:bg-surface-2">
                    Fill With Sample
                  </button>
                  {(own.answer || own.sources || own.question) && (
                    <button
                      onClick={() => {
                        const before = own;
                        setInputs((all) => ({ ...all, [OWN]: EMPTY }));
                        setFieldErrors({});
                        setToast({ message: "Text cleared", undo: () => setInputs((all) => ({ ...all, [OWN]: before })) });
                      }}
                      className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      Clear
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => analyze()}
                disabled={loading === tab || !engine.configured}
                title={engine.configured ? "Ctrl + Enter" : "Live analysis is off on this deployment"}
                className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-page transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === tab ? <Spinner className="size-4" /> : <Bolt className="size-4" />}
                {loading === tab ? "Analyzing…" : demo ? "Run Live Analysis" : "Analyze Answer"}
              </button>
            </div>
          </div>
          {error?.tab === tab && (
            <p role="alert" className="mt-3 rounded-lg border border-refuted/40 bg-refuted-soft px-3.5 py-2.5 text-[14px]">
              {error.message}
            </p>
          )}
          {!engine.configured && <p className="mt-3 text-[13px] text-ink-2">Live analysis is off on this deployment. The saved examples still work.</p>}
        </div>
      </div>

      {/* Results */}
      <div ref={resultsRef} className="mt-10 scroll-mt-6">
        {run ? (
          <div className={`transition-opacity duration-300 ${loading === tab ? "pointer-events-none opacity-50" : ""}`}>
            <Dashboard
              key={`${tab}-${run.result.meta.createdAt}`}
              result={run.result}
              labels={run.inputs === JSON.stringify(demo ? original(demo) : current) ? labels : null}
              origin={run.origin}
              threshold={threshold}
              onThreshold={setThreshold}
              canRunLive={false}
              running={loading === tab}
              onRunLive={() => analyze(tab)}
              onToast={(message) => setToast({ message })}
            />
          </div>
        ) : loading === tab ? (
          <AnalyzingState sentences={nS} passages={passages.length} />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-[15px] font-medium">Results will appear here</p>
            <p className="mt-1 text-[14px] text-ink-2">Paste an answer and its sources, or press Fill With Sample, then Analyze Answer.</p>
          </div>
        )}
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        {toast && (
          <div className="fade-up pointer-events-auto flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-[14px] text-page shadow-lg">
            {toast.message}
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="rounded px-1.5 font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function AnalyzingState({ sentences, passages }: { sentences: number; passages: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-[15px] font-medium">
        <Spinner className="size-4" /> Asking {sentences * passages + sentences} questions in {passages + 1} parallel calls…
      </p>
      <div className="mt-5 grid w-max max-w-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, passages)}, minmax(0.75rem, 2.25rem))` }} aria-hidden>
        {Array.from({ length: sentences * passages }, (_, k) => (
          <span key={k} className="pulse-soft h-8 rounded-[3px] bg-neutral" style={{ animationDelay: `${((k % passages) + Math.floor(k / passages)) * 70}ms` }} />
        ))}
      </div>
    </div>
  );
}

function Field({ label, hint, error, id, children }: { label: string; hint?: string; error?: string; id?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium">{label}</span>
        {hint && <span className="text-[12px] tabular-nums text-muted">{hint}</span>}
      </span>
      {children}
      {error && (
        <span id={`${id}-error`} className="mt-1.5 block text-[13px] text-refuted">
          {error}
        </span>
      )}
    </label>
  );
}
