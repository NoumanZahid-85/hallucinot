"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckResult, Demo } from "@/lib/types";
import { LIMITS, splitPassages, splitSentences } from "@/lib/split";
import { Briefcase, Flag, Headset, Pencil, Planet, Spinner } from "./Icons";
import { BotAvatar, GridSkeleton, QuestionBubble, Review } from "./Review";
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
const ICONS: Record<string, typeof Headset> = { "support-bot": Headset, webb: Planet, "hr-policy": Briefcase, [OWN]: Pencil };

interface Props {
  demos: Demo[];
  saved: Record<string, CheckResult>;
  engine: { label: string; configured: boolean };
}

export function Playground({ demos, saved, engine }: Props) {
  const [tab, setTab] = useState(demos[0].id);
  const [inputs, setInputs] = useState<Record<string, Inputs>>(() =>
    Object.fromEntries([...demos.map((d) => [d.id, { question: d.question, answer: d.answer, sources: d.sources }]), [OWN, EMPTY]]),
  );
  const [runs, setRuns] = useState<Record<string, Run>>(() =>
    Object.fromEntries(
      demos.filter((d) => saved[d.id]).map((d) => [d.id, { result: saved[d.id], origin: "saved" as const, inputs: JSON.stringify(inputs0(d)) }]),
    ),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState<Record<string, number[]>>({});
  const [editing, setEditing] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<{ tab: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Inputs, string>>>({});
  const [autoAccept, setAutoAccept] = useState(0.8);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const sourcesRef = useRef<HTMLTextAreaElement>(null);

  const demo = demos.find((d) => d.id === tab) ?? null;
  const current = inputs[tab];
  const run = runs[tab];
  const own = inputs[OWN];
  const ownDirty = !!(own.answer || own.sources) && runs[OWN]?.inputs !== JSON.stringify(own);

  // The chosen example lives in the URL (?example=webb), so it can be shared and survives reloads.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("example");
    if (q && (q === OWN || demos.some((d) => d.id === q))) setTab(q);
  }, [demos]);

  // Warn before leaving with pasted text that hasn't been checked.
  useEffect(() => {
    if (!ownDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [ownDirty]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const scrollTo = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  function choose(id: string) {
    setTab(id);
    setError(null);
    setFieldErrors({});
    setEditing(id === OWN ? !runs[OWN] : true);
    const url = new URL(window.location.href);
    url.searchParams.set("example", id);
    window.history.replaceState(null, "", url);
  }

  async function check(forTab = tab) {
    const body = inputs[forTab];
    if (forTab === OWN) {
      const errs: Partial<Record<keyof Inputs, string>> = {};
      const nS = splitSentences(body.answer).length, nP = splitPassages(body.sources).length;
      if (!nS) errs.answer = "Paste the AI answer you want to check.";
      else if (body.answer.length > LIMITS.answerChars || nS > LIMITS.sentences) errs.answer = `Shorten the answer to ${LIMITS.sentences} sentences or fewer.`;
      if (!nP) errs.sources = "Paste at least one source passage.";
      else if (body.sources.length > LIMITS.sourceChars || nP > LIMITS.passages) errs.sources = `Shorten the sources to ${LIMITS.passages} passages or fewer.`;
      setFieldErrors(errs);
      if (errs.answer) return answerRef.current?.focus();
      if (errs.sources) return sourcesRef.current?.focus();
    }
    setLoading(forTab);
    setError(null);
    requestAnimationFrame(() => scrollTo(resultsRef.current));
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `The check failed (status ${res.status}). Try again in a moment.`);
      setRuns((r) => ({ ...r, [forTab]: { result: data as CheckResult, origin: "live", inputs: JSON.stringify(body) } }));
      setRevealed((r) => ({ ...r, [forTab]: true }));
      if (forTab === OWN) setEditing(false);
    } catch (e) {
      setError({ tab: forTab, message: e instanceof Error ? e.message : "The check didn't finish. Try again in a moment." });
    } finally {
      setLoading(null);
    }
  }

  function reveal() {
    if (!run) return check();
    setRevealed((r) => ({ ...r, [tab]: true }));
    requestAnimationFrame(() => scrollTo(resultsRef.current));
  }

  const toggleFlag = (s: number) =>
    setFlags((f) => {
      const cur = f[tab] ?? [];
      return { ...f, [tab]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] };
    });

  const update = (field: keyof Inputs, value: string) => {
    setInputs((all) => ({ ...all, [tab]: { ...all[tab], [field]: value } }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: undefined }));
  };

  function clearOwn() {
    const before = inputs[OWN];
    setInputs((all) => ({ ...all, [OWN]: EMPTY }));
    setFieldErrors({});
    setToast({ message: "Text cleared", undo: () => setInputs((all) => ({ ...all, [OWN]: before })) });
  }

  const nextDemo = () => {
    const i = demos.findIndex((d) => d.id === tab);
    choose(i >= 0 && i < demos.length - 1 ? demos[i + 1].id : OWN);
    requestAnimationFrame(() => scrollTo(document.getElementById("playground")));
  };

  const isRevealed = !!run && (revealed[tab] || tab === OWN) && !(tab === OWN && editing);
  const labels = demo && run && run.result.sentences.length === demo.labels.length ? demo.labels : null;
  const sentences = splitSentences(current.answer);
  const myFlags = flags[tab] ?? [];

  return (
    <section id="playground" className="scroll-mt-4" aria-label="Playground">
      {/* Example picker */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="tablist" aria-label="Examples">
        {[...demos.map((d) => ({ id: d.id, label: d.label, blurb: d.blurb })), { id: OWN, label: "Your Own Text", blurb: "Paste & check" }].map((t) => {
          const Icon = ICONS[t.id] ?? Pencil;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => choose(t.id)}
              className={`group flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] sm:p-4 ${
                on ? "border-brand bg-brand-soft" : "border-line bg-card hover:border-brand/50"
              }`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${on ? "bg-brand text-brand-ink" : "bg-bg text-brand group-hover:bg-brand-soft"}`}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display font-bold leading-tight">{t.label}</span>
                <span className="mt-0.5 block truncate text-sm text-muted">{t.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {/* Guess mode: tap sentences you don't trust */}
        {demo && !isRevealed && loading !== tab && (
          <div className="rise rounded-3xl border border-line bg-card p-4 sm:p-6">
            <QuestionBubble question={current.question} />
            <div className="mt-3 flex gap-3">
              <BotAvatar />
              <div className="min-w-0 flex-1 break-words rounded-3xl rounded-tl-md bg-bg px-5 py-4 text-[17px] leading-[1.95]">
                {sentences.map((s, i) => {
                  const on = myFlags.includes(i);
                  return (
                    <span key={i}>
                      {/* Inline span so a flagged sentence can wrap across lines; keyboard handled below. */}
                      <span
                        role="button"
                        tabIndex={0}
                        aria-pressed={on}
                        aria-label={`${on ? "Unflag" : "Flag"} sentence ${i + 1}: ${s}`}
                        onClick={() => toggleFlag(i)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleFlag(i);
                          }
                        }}
                        className={`cursor-pointer rounded-[0.3em] transition-colors duration-150 ${on ? "flagged" : "hover:bg-brand-soft"}`}
                      >
                        {s}
                      </span>
                      {on && <Flag className="ml-0.5 inline size-3.5 -translate-y-1 text-brand" />}{" "}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="flex items-center gap-2 text-[15px] text-muted">
                <Flag className="size-4 text-brand" />
                {myFlags.length ? (
                  <span>
                    <span className="font-bold tabular-nums text-ink">{myFlags.length}</span> flagged. Ready?
                  </span>
                ) : (
                  "Tap any sentence you think is made up."
                )}
              </p>
              <div className="flex gap-2">
                {myFlags.length === 0 && (
                  <button onClick={reveal} className="rounded-xl px-4 py-2.5 font-bold text-muted transition-colors hover:text-ink">
                    Just Show Me
                  </button>
                )}
                <button
                  onClick={reveal}
                  className="rounded-xl bg-brand px-5 py-2.5 font-bold text-brand-ink shadow-[0_6px_20px_-8px_var(--brand)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  Check Answer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Composer for your own text */}
        {tab === OWN && editing && (
          <div className="rise rounded-3xl border border-line bg-card p-4 sm:p-6">
            <Field label="Question" hint="optional">
              <input
                name="question"
                autoComplete="off"
                value={own.question}
                onChange={(e) => update("question", e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" && (e.ctrlKey || e.metaKey) ? check() : undefined)}
                placeholder="What did the user ask?…"
                className="w-full rounded-xl border-2 border-line bg-bg px-4 py-2.5 outline-none transition-colors focus:border-brand"
              />
            </Field>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="AI Answer" hint={`${splitSentences(own.answer).length}/${LIMITS.sentences} sentences`} error={fieldErrors.answer} id="answer">
                <textarea
                  ref={answerRef}
                  name="answer"
                  autoComplete="off"
                  rows={8}
                  value={own.answer}
                  onChange={(e) => update("answer", e.target.value)}
                  onKeyDown={(e) => (e.key === "Enter" && (e.ctrlKey || e.metaKey) ? (e.preventDefault(), check()) : undefined)}
                  aria-invalid={!!fieldErrors.answer}
                  aria-describedby={fieldErrors.answer ? "answer-error" : undefined}
                  placeholder="Paste the chatbot’s answer…"
                  className="w-full resize-y rounded-xl border-2 border-line bg-bg px-4 py-3 leading-relaxed outline-none transition-colors focus:border-brand aria-[invalid=true]:border-refuted"
                />
              </Field>
              <Field label="Sources" hint={`${splitPassages(own.sources).length}/${LIMITS.passages} passages`} error={fieldErrors.sources} id="sources">
                <textarea
                  ref={sourcesRef}
                  name="sources"
                  autoComplete="off"
                  rows={8}
                  value={own.sources}
                  onChange={(e) => update("sources", e.target.value)}
                  onKeyDown={(e) => (e.key === "Enter" && (e.ctrlKey || e.metaKey) ? (e.preventDefault(), check()) : undefined)}
                  aria-invalid={!!fieldErrors.sources}
                  aria-describedby={fieldErrors.sources ? "sources-error" : "sources-help"}
                  placeholder={"# Refund policy\nPaste the documents it should be based on…"}
                  className="w-full resize-y rounded-xl border-2 border-line bg-bg px-4 py-3 leading-relaxed outline-none transition-colors focus:border-brand aria-[invalid=true]:border-refuted"
                />
              </Field>
            </div>
            <p id="sources-help" className="mt-2 text-xs text-muted">
              Tip: start a document with “# Title”. A blank line starts a new passage.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
              <button onClick={() => setInputs((all) => ({ ...all, [OWN]: SAMPLE }))} className="rounded-xl px-4 py-2.5 font-bold text-brand transition-colors hover:bg-brand-soft">
                Fill With Sample
              </button>
              {(own.answer || own.sources || own.question) && (
                <button onClick={clearOwn} className="rounded-xl px-4 py-2.5 font-bold text-muted transition-colors hover:text-ink">
                  Clear
                </button>
              )}
              <button
                onClick={() => check()}
                disabled={loading === OWN}
                className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-bold text-brand-ink shadow-[0_6px_20px_-8px_var(--brand)] transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-70"
              >
                {loading === OWN && <Spinner className="size-4" />}
                {loading === OWN ? "Checking…" : "Check Answer"}
                <kbd className="hidden rounded-md bg-brand-ink/15 px-1.5 text-xs font-normal sm:inline">Ctrl&nbsp;+&nbsp;Enter</kbd>
              </button>
            </div>
          </div>
        )}

        {!engine.configured && (
          <p className="mt-3 text-sm text-unsourced">Live checks are off on this deployment. Add an engine key to enable them; the examples still work.</p>
        )}
        {error?.tab === tab && (
          <p role="alert" className="mt-4 rounded-2xl bg-refuted-hl px-4 py-3 text-[15px]">
            {error.message}
          </p>
        )}

        <div ref={resultsRef} className="scroll-mt-4">
          {loading === tab && !run?.result && <div className="mt-6"><GridSkeleton sentences={sentences.length} passages={splitPassages(current.sources).length} /></div>}
          {run && isRevealed && (
            <div className="mt-2">
              <Review
                key={`${tab}-${run.result.meta.createdAt}`}
                result={run.result}
                labels={labels}
                flags={myFlags}
                origin={run.origin}
                autoAccept={autoAccept}
                onAutoAccept={setAutoAccept}
                running={loading === tab}
                canRunLive={engine.configured && tab !== OWN}
                onRunLive={() => check(tab)}
                onPlayAgain={demo ? () => {
                  setFlags((f) => ({ ...f, [tab]: [] }));
                  setRevealed((r) => ({ ...r, [tab]: false }));
                } : undefined}
                onNext={nextDemo}
                onEdit={tab === OWN ? () => setEditing(true) : undefined}
                onToast={(message) => setToast({ message })}
              />
            </div>
          )}
        </div>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        {toast && (
          <div className="rise pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink px-4 py-2.5 text-sm text-bg shadow-lg">
            {toast.message}
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="rounded-lg px-2 py-0.5 font-bold text-brand transition-colors hover:bg-bg/10"
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

function inputs0(d: Demo): Inputs {
  return { question: d.question, answer: d.answer, sources: d.sources };
}

function Field({ label, hint, error, id, children }: { label: string; hint?: string; error?: string; id?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-bold">{label}</span>
        {hint && <span className="text-xs tabular-nums text-muted">{hint}</span>}
      </span>
      {children}
      {error && (
        <span id={`${id}-error`} className="mt-1.5 block text-sm text-refuted">
          {error}
        </span>
      )}
    </label>
  );
}
