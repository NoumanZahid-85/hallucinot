"use client";

import { useState } from "react";
import type { CheckResult, Demo } from "@/lib/types";
import { LIMITS, splitPassages, splitSentences } from "@/lib/split";
import { MatrixSkeleton, Results } from "./Results";

type Inputs = { question: string; answer: string; sources: string };
const CUSTOM = "custom";

interface Props {
  demos: Demo[];
  saved: Record<string, CheckResult>;
  engine: { label: string; configured: boolean };
}

export function ReceiptsApp({ demos, saved, engine }: Props) {
  const original = (id: string): Inputs => {
    const d = demos.find((x) => x.id === id);
    return d ? { question: d.question, answer: d.answer, sources: d.sources } : { question: "", answer: "", sources: "" };
  };

  const [tab, setTab] = useState(demos[0].id);
  const [inputs, setInputs] = useState<Record<string, Inputs>>(() =>
    Object.fromEntries([...demos.map((d) => [d.id, original(d.id)]), [CUSTOM, original(CUSTOM)]]),
  );
  const [results, setResults] = useState<Record<string, { result: CheckResult; origin: "saved" | "live" }>>(() =>
    Object.fromEntries(Object.entries(saved).map(([id, result]) => [id, { result, origin: "saved" as const }])),
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<{ tab: string; message: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [autoAccept, setAutoAccept] = useState(0.8);

  const demo = demos.find((d) => d.id === tab) ?? null;
  const current = inputs[tab];
  const run = results[tab];
  const pristine = demo !== null && JSON.stringify(current) === JSON.stringify(original(tab));
  // Only score against hand labels when the run used the untouched demo text.
  const labels = demo && pristine && run && run.result.sentences.length === demo.labels.length ? demo.labels : null;
  const showEditor = tab === CUSTOM || editing;

  const nSentences = splitSentences(current.answer).length;
  const nPassages = splitPassages(current.sources).length;
  const overLimit =
    current.answer.length > LIMITS.answerChars ||
    current.sources.length > LIMITS.sourceChars ||
    nSentences > LIMITS.sentences ||
    nPassages > LIMITS.passages;

  async function check() {
    const forTab = tab;
    setLoading(forTab);
    setError(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs[forTab]),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResults((r) => ({ ...r, [forTab]: { result: data as CheckResult, origin: "live" } }));
      setEditing(false);
    } catch (e) {
      setError({ tab: forTab, message: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setLoading(null);
    }
  }

  const update = (field: keyof Inputs, value: string) => setInputs((all) => ({ ...all, [tab]: { ...all[tab], [field]: value } }));

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-2.5">
          <ReceiptIcon />
          <span className="text-lg font-semibold tracking-tight">Receipts</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs">
          <span className={`size-2 rounded-full ${engine.configured ? "bg-ok" : "bg-warn"}`} />
          {engine.configured ? engine.label : "no engine key · saved demos only"}
        </div>
      </header>

      {/* Hero */}
      <section className="pb-8 pt-6 sm:pt-10">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Every sentence an AI writes should come with a <span className="text-accent">receipt</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
          RAG chatbots still make things up, and checking every answer by hand doesn&apos;t scale. Paste an answer and its sources. Receipts checks every sentence against every passage in a couple of seconds and shows which claims are backed, contradicted, or invented.
        </p>
        <ol className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ["Split", "The answer becomes sentences and the sources become passages. A filter skips greetings and filler."],
            ["Ask", "For each passage × sentence pair, a typed Choice question: supports, contradicts, or says nothing. All run in parallel."],
            ["Route", "Each sentence keeps its strongest receipt. Low-confidence verdicts go to a human review queue."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-md border border-line bg-surface p-4">
              <div className="font-mono text-xs text-accent">0{i + 1}</div>
              <div className="mt-1 font-semibold">{t}</div>
              <p className="mt-1 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tabs */}
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Examples">
        {[...demos.map((d) => ({ id: d.id, label: d.label })), { id: CUSTOM, label: "Paste your own" }].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setEditing(false);
              setError(null);
            }}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              tab === t.id ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink hover:border-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Inputs */}
      <section className="mt-4 rounded-md border border-line bg-surface p-5">
        {demo && !showEditor && (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">{demo.blurb}</div>
              <p className="mt-1 text-sm text-muted">
                {nSentences} sentences · {nPassages} source passages
                {!pristine && " · edited"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-muted">
                View / edit inputs
              </button>
              <RunButton onClick={check} loading={loading === tab} disabled={!engine.configured || overLimit} again={!!run} />
            </div>
          </div>
        )}

        {showEditor && (
          <div className="space-y-4">
            <Field label="Question the user asked (optional)" value={current.question} onChange={(v) => update("question", v)} rows={2} placeholder="What did the user ask the chatbot?" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="AI answer"
                hint={`${nSentences}/${LIMITS.sentences} sentences`}
                value={current.answer}
                onChange={(v) => update("answer", v)}
                rows={12}
                placeholder="Paste the answer your chatbot or LLM produced."
              />
              <Field
                label="Sources"
                hint={`${nPassages}/${LIMITS.passages} passages · start a document with "# Title"`}
                value={current.sources}
                onChange={(v) => update("sources", v)}
                rows={12}
                placeholder={"# Refund policy\nPaste the documents the answer should be based on.\n\nSeparate paragraphs with a blank line."}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {nSentences && nPassages
                  ? `${nSentences} sentences × ${nPassages} passages → ${nSentences * nPassages + nSentences} typed questions in ${nPassages + 1} parallel calls`
                  : "Add an answer and at least one source passage."}
                {overLimit && <span className="text-bad"> · over the size limit</span>}
              </p>
              <div className="flex gap-2">
                {demo && (
                  <button onClick={() => setEditing(false)} className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-muted">
                    Close
                  </button>
                )}
                {demo && !pristine && (
                  <button
                    onClick={() => setInputs((all) => ({ ...all, [tab]: original(tab) }))}
                    className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-muted"
                  >
                    Reset example
                  </button>
                )}
                <RunButton
                  onClick={check}
                  loading={loading === tab}
                  disabled={!engine.configured || overLimit || !nSentences || !nPassages}
                  again={false}
                />
              </div>
            </div>
          </div>
        )}

        {!engine.configured && (
          <p className="mt-3 text-xs text-warn">Live checks are off because this deployment has no engine key. The saved runs below are real results.</p>
        )}
        {error?.tab === tab && <p className="mt-3 rounded bg-bad-soft px-3 py-2 text-sm text-bad">{error.message}</p>}
      </section>

      {/* Results */}
      <section className="mt-8">
        {loading === tab ? (
          <MatrixSkeleton sentences={nSentences} passages={nPassages} />
        ) : run ? (
          <Results
            key={`${tab}-${run.result.meta.createdAt}`}
            result={run.result}
            origin={run.origin}
            labels={labels}
            autoAccept={autoAccept}
            onAutoAccept={setAutoAccept}
          />
        ) : (
          <div className="rounded-md border border-dashed border-line p-10 text-center text-sm text-muted">
            {engine.configured
              ? "Run the check to see every sentence matched against its sources."
              : "No saved run for this example yet, and live checks are off."}
          </div>
        )}
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <p>
          Receipts uses <span className="text-ink">typed decisions</span> instead of an LLM judge. The engine answers fixed-choice questions with probabilities, and plain code turns those into verdicts and thresholds. Engine: {engine.label}.
        </p>
        <p className="mt-2">Lumen Notes and Kestrel Analytics are fictional sample companies. The Webb telescope notes are factual, and the AI answer about it contains deliberate errors.</p>
      </footer>
    </div>
  );
}

function RunButton({ onClick, loading, disabled, again }: { onClick: () => void; loading: boolean; disabled: boolean; again: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-black"
    >
      {loading ? "Checking…" : again ? "Run live again" : "Check receipts"}
    </button>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        {hint && <span className="font-mono text-xs font-normal text-muted">{hint}</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-md border border-line bg-bg px-3 py-2 font-mono text-[13px] leading-relaxed outline-none focus:border-accent"
      />
    </label>
  );
}

function ReceiptIcon() {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden>
      <path d="M2 1h18v23l-3-2-3 2-3-2-3 2-3-2-3 2V1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 7h10M6 11h10M6 15h6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
