"use client";

import { useRef, useState } from "react";
import type { CheckResult, Demo } from "@/lib/types";
import { LIMITS, splitPassages, splitSentences } from "@/lib/split";
import { Hero } from "./Hero";
import { GridSkeleton, Results } from "./Results";
import { prefersReducedMotion } from "./ui";

type Inputs = { question: string; answer: string; sources: string };
const OWN = "own";
const EMPTY: Inputs = { question: "", answer: "", sources: "" };
const SAMPLE: Inputs = {
  question: "Where is the Eiffel Tower, and when was it built?",
  answer:
    "The Eiffel Tower is in Berlin. It was completed in 1889 for the World's Fair. It is the tallest building in Europe. Hope that helps!",
  sources:
    "# Eiffel Tower\nThe Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.\n\nIt was completed in 1889 as the centrepiece of the 1889 World's Fair.",
};

interface Props {
  demos: Demo[];
  saved: Record<string, CheckResult>;
  engine: { label: string; configured: boolean };
}

export function App({ demos, saved, engine }: Props) {
  const original = (id: string): Inputs => {
    const d = demos.find((x) => x.id === id);
    return d ? { question: d.question, answer: d.answer, sources: d.sources } : EMPTY;
  };

  const [tab, setTab] = useState(demos[0].id);
  const [inputs, setInputs] = useState<Record<string, Inputs>>(() =>
    Object.fromEntries([...demos.map((d) => [d.id, original(d.id)]), [OWN, EMPTY]]),
  );
  const [results, setResults] = useState<Record<string, { result: CheckResult; origin: "saved" | "live" }>>(() =>
    Object.fromEntries(Object.entries(saved).map(([id, result]) => [id, { result, origin: "saved" as const }])),
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<{ tab: string; message: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [autoAccept, setAutoAccept] = useState(0.8);
  const workspaceRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const demo = demos.find((d) => d.id === tab) ?? null;
  const current = inputs[tab];
  const run = results[tab];
  const pristine = demo !== null && JSON.stringify(current) === JSON.stringify(original(tab));
  // Hand labels only apply to the untouched example text.
  const labels = demo && pristine && run && run.result.sentences.length === demo.labels.length ? demo.labels : null;
  const showComposer = tab === OWN || editing;

  const nSentences = splitSentences(current.answer).length;
  const nPassages = splitPassages(current.sources).length;
  const problems = [
    current.answer.length > LIMITS.answerChars && `the answer is over ${LIMITS.answerChars.toLocaleString()} characters`,
    nSentences > LIMITS.sentences && `the answer has more than ${LIMITS.sentences} sentences`,
    current.sources.length > LIMITS.sourceChars && `the sources are over ${LIMITS.sourceChars.toLocaleString()} characters`,
    nPassages > LIMITS.passages && `the sources have more than ${LIMITS.passages} passages`,
  ].filter(Boolean) as string[];
  const canCheck = engine.configured && !loading && nSentences > 0 && nPassages > 0 && problems.length === 0;

  const scrollTo = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  function openTab(id: string) {
    setTab(id);
    setEditing(false);
    setError(null);
  }

  async function check() {
    if (!canCheck) return;
    const forTab = tab;
    setLoading(forTab);
    setError(null);
    requestAnimationFrame(() => scrollTo(resultsRef.current));
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs[forTab]),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `The check failed with status ${res.status}. Try again.`);
      setResults((r) => ({ ...r, [forTab]: { result: data as CheckResult, origin: "live" } }));
      setEditing(false);
      requestAnimationFrame(() => scrollTo(resultsRef.current));
    } catch (e) {
      setError({ tab: forTab, message: e instanceof Error ? e.message : "The check did not finish. Try again." });
    } finally {
      setLoading(null);
    }
  }

  const update = (field: keyof Inputs, value: string) => setInputs((all) => ({ ...all, [tab]: { ...all[tab], [field]: value } }));
  const onComposerKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      check();
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <a href="#" className="flex items-center gap-2 text-xl font-bold tracking-[-0.02em]">
          <Mark /> Alibi
        </a>
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <span className={`size-2 rounded-full ${engine.configured ? "bg-backed" : "bg-unsourced"}`} />
          {engine.configured ? `Live engine: ${engine.label}` : "Live checks are off, examples only"}
        </p>
      </header>

      <Hero
        onExample={() => {
          openTab(demos[0].id);
          scrollTo(workspaceRef.current);
        }}
        onOwn={() => {
          openTab(OWN);
          scrollTo(workspaceRef.current);
          setTimeout(() => answerRef.current?.focus({ preventScroll: true }), 450);
        }}
      />

      <main>
        <section ref={workspaceRef} id="check" className="scroll-mt-4">
          <h2 className="text-[1.3125rem] font-semibold tracking-[-0.01em]">Pick an answer to check</h2>
          <div className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
            {[...demos.map((d) => ({ id: d.id, label: d.label })), { id: OWN, label: "Your own text" }].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => openTab(t.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-[15px] transition-colors ${
                  tab === t.id ? "bg-ink font-medium text-paper" : "text-ink-2 hover:bg-sheet hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {demo && !showComposer && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-y border-rule py-4">
                <p className="text-[15px] text-ink-2">
                  {demo.blurb}. {nSentences} sentences, {nPassages} source passages
                  {!pristine && ", edited"}.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="rounded-lg border border-rule bg-sheet px-3.5 py-2 text-sm hover:border-ink-2">
                    Edit the text
                  </button>
                  <button
                    onClick={check}
                    disabled={!canCheck}
                    className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading === tab ? "Checking…" : run ? "Check again live" : "Check answer"}
                  </button>
                </div>
              </div>
            )}

            {showComposer && (
              <div className="rounded-[4px] bg-sheet p-5 shadow-[0_1px_0_var(--rule)] sm:p-6">
                <label className="block">
                  <span className="text-sm font-medium">Question the user asked</span>
                  <span className="text-sm text-ink-2"> (optional)</span>
                  <input
                    value={current.question}
                    onChange={(e) => update("question", e.target.value)}
                    onKeyDown={onComposerKey}
                    placeholder="What did the user ask the chatbot?"
                    className="mt-1.5 w-full rounded-md border border-rule bg-paper px-3 py-2 text-[15px] outline-none focus:border-pencil"
                  />
                </label>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <Field
                    ref={answerRef}
                    label="AI answer"
                    meta={`${nSentences} of ${LIMITS.sentences} sentences`}
                    value={current.answer}
                    onChange={(v) => update("answer", v)}
                    onKeyDown={onComposerKey}
                    placeholder="Paste the answer your chatbot gave."
                  />
                  <Field
                    label="Sources"
                    meta={`${nPassages} of ${LIMITS.passages} passages`}
                    value={current.sources}
                    onChange={(v) => update("sources", v)}
                    onKeyDown={onComposerKey}
                    placeholder={"# Refund policy\nPaste the documents the answer should be based on.\n\nLeave a blank line between passages."}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-2">Start each document with a line like “# Refund policy”. A blank line starts a new passage.</p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-2">
                    {problems.length
                      ? <span className="text-refuted">Shorten it: {problems.join(", ")}.</span>
                      : nSentences && nPassages
                        ? `${nSentences * nPassages + nSentences} questions in ${nPassages + 1} parallel calls.`
                        : "Add an answer and at least one source passage."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tab === OWN && (
                      <button
                        onClick={() => setInputs((all) => ({ ...all, [OWN]: SAMPLE }))}
                        className="rounded-lg border border-rule px-3.5 py-2 text-sm hover:border-ink-2"
                      >
                        Fill in a sample
                      </button>
                    )}
                    {tab === OWN && (current.answer || current.sources) && (
                      <button onClick={() => setInputs((all) => ({ ...all, [OWN]: EMPTY }))} className="rounded-lg px-3.5 py-2 text-sm text-ink-2 hover:text-ink">
                        Clear
                      </button>
                    )}
                    {demo && !pristine && (
                      <button
                        onClick={() => setInputs((all) => ({ ...all, [tab]: original(tab) }))}
                        className="rounded-lg px-3.5 py-2 text-sm text-ink-2 hover:text-ink"
                      >
                        Undo my edits
                      </button>
                    )}
                    {demo && (
                      <button onClick={() => setEditing(false)} className="rounded-lg border border-rule px-3.5 py-2 text-sm hover:border-ink-2">
                        Close editor
                      </button>
                    )}
                    <button
                      onClick={check}
                      disabled={!canCheck}
                      title="Ctrl + Enter"
                      className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading === tab ? "Checking…" : "Check answer"}
                      <span className="ml-2 hidden font-normal opacity-60 sm:inline">Ctrl + Enter</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!engine.configured && (
              <p className="mt-3 text-sm text-unsourced">This deployment has no engine key, so live checks are off. The saved example runs are real.</p>
            )}
            {error?.tab === tab && (
              <p role="alert" className="mt-4 rounded-md bg-refuted-hl px-4 py-3 text-[15px]">
                {error.message}
              </p>
            )}
          </div>

          <div ref={resultsRef} className="scroll-mt-2 pt-6">
            {loading === tab ? (
              <GridSkeleton sentences={nSentences} passages={nPassages} />
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
              tab !== OWN && (
                <p className="rounded-[4px] border border-dashed border-rule p-8 text-center text-[15px] text-ink-2">
                  {engine.configured ? "Check this answer to see every sentence matched against its sources." : "This example has no saved run yet."}
                </p>
              )
            )}
          </div>
        </section>

        <HowItWorks />
      </main>

      <footer className="mt-20 border-t border-rule py-8 text-sm leading-relaxed text-ink-2">
        <p className="max-w-[46rem]">
          Alibi asks a decision model short multiple-choice questions instead of asking a chatbot to grade a chatbot. Plain code turns the
          answers into verdicts. Lumen Notes and Kestrel Analytics are made-up companies. The Webb telescope notes are factual, and the
          answer about it contains deliberate mistakes.
        </p>
      </footer>
    </div>
  );
}

function HowItWorks() {
  const bars: [string, number, string][] = [
    ["Backs it", 0.01, "bg-backed"],
    ["Contradicts it", 0.99, "bg-refuted"],
    ["Silent", 0.0, "bg-filler"],
  ];
  return (
    <section className="mt-24">
      <h2 className="text-[1.3125rem] font-semibold tracking-[-0.01em]">How Alibi checks an answer</h2>
      <ol className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-3">
        <li>
          <p className="font-semibold">1. Split</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
            The answer is cut into sentences and the sources into passages. Greetings and sign-offs are set aside, because there is
            nothing to check.
          </p>
        </li>
        <li>
          <p className="font-semibold">2. Ask</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
            For every passage and sentence, the engine answers one multiple-choice question and returns a probability for each option:
          </p>
          <div className="mt-3 rounded-[4px] bg-sheet p-4">
            <p className="font-serif text-[15px] leading-relaxed">
              Does this passage back, contradict, or say nothing about “Refunds are open for 60 days”?
            </p>
            <div className="mt-3 space-y-1.5">
              {bars.map(([label, v, color]) => (
                <div key={label} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-sm">
                  <span className="text-ink-2">{label}</span>
                  <span className="h-1.5 rounded-full bg-rule">
                    <span className={`block h-full rounded-full ${color}`} style={{ width: `${v * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{Math.round(v * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </li>
        <li>
          <p className="font-semibold">3. Decide</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
            Each sentence keeps its strongest source. When the engine is less sure than your threshold, the sentence goes to a person.
            Moving the threshold re-sorts everything instantly, with no new calls.
          </p>
        </li>
      </ol>
    </section>
  );
}

function Field({
  ref,
  label,
  meta,
  value,
  onChange,
  onKeyDown,
  placeholder,
}: {
  ref?: React.Ref<HTMLTextAreaElement>;
  label: string;
  meta: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs tabular-nums text-ink-2">{meta}</span>
      </span>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={11}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-md border border-rule bg-paper px-3 py-2.5 font-serif text-[15px] leading-relaxed outline-none focus:border-pencil"
      />
    </label>
  );
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect x="1" y="5" width="20" height="5" rx="1.5" fill="var(--backed-hl)" />
      <rect x="1" y="13" width="13" height="5" rx="1.5" fill="var(--refuted-hl)" />
      <path d="M3 7.5h16M3 15.5h9" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
