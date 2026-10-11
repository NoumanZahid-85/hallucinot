"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CheckResult, Demo } from "@/lib/types";
import { judge } from "@/lib/verdict";
import { Analyzer } from "./Analyzer";
import { HeroPreview } from "./HeroPreview";
import { Logo, Moon, Sun } from "./Icons";
import { evidenceColor, usd, VERDICT } from "./ui";

interface Props {
  demos: Demo[];
  saved: Record<string, CheckResult>;
  engine: { label: string; configured: boolean };
}

export function App({ demos, saved, engine }: Props) {
  // Proof numbers come straight from the saved runs, so they can't drift from the data.
  const runs = demos.filter((d) => saved[d.id]);
  const total = runs.reduce((n, d) => n + d.labels.length, 0);
  const agree = runs.reduce((n, d) => n + d.labels.filter((l, s) => judge(saved[d.id], s, 0.8).verdict === l).length, 0);
  const avgMs = runs.reduce((n, d) => n + saved[d.id].meta.ms, 0) / Math.max(1, runs.length);
  const avgCost = runs.reduce((n, d) => n + saved[d.id].meta.listPriceUsd, 0) / Math.max(1, runs.length);

  const goTo = (example: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("example", example);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event("analyzer:select"));
    document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5">
        <Link href="/" className="flex items-center gap-2.5 rounded-md text-[17px] font-semibold tracking-tight" translate="no">
          <Logo /> Hallucinot
        </Link>
        <nav className="flex items-center gap-1 text-[14px]" aria-label="Main">
          <a href="#how" className="hidden rounded-md px-3 py-1.5 text-ink-2 transition-colors hover:bg-surface hover:text-ink sm:block">
            How it works
          </a>
          <a href="#analyzer" className="hidden rounded-md px-3 py-1.5 text-ink-2 transition-colors hover:bg-surface hover:text-ink sm:block">
            Analyzer
          </a>
          <span className="mx-2 hidden h-4 w-px bg-hairline sm:block" />
          <span className="hidden items-center gap-1.5 text-[13px] text-ink-2 md:flex" title={engine.configured ? `Live analysis runs on ${engine.label}` : undefined}>
            <span className={`size-1.5 rounded-full ${engine.configured ? "bg-online" : "bg-unsourced"}`} />
            {engine.configured ? "Engine online" : "Examples only"}
          </span>
          <ThemeToggle />
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:pt-16">
          <div>
            <h1 className="font-serif text-[3.4rem] leading-[0.98] tracking-[-0.015em] text-balance sm:text-7xl">Find the sentences your AI made up.</h1>
            <p className="mt-6 max-w-[34rem] text-[18px] leading-relaxed text-ink-2 text-pretty">
              Paste a chatbot answer and the documents it should be based on. Hallucinot checks every sentence against every passage, then shows what
              is supported, what is contradicted, and what has no source at all.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => goTo(demos[0].id)} className="rounded-lg bg-ink px-5 py-3 text-[15px] font-medium text-page transition-opacity hover:opacity-85">
                Analyze an Example
              </button>
              <button
                onClick={() => goTo("own")}
                className="rounded-lg border border-border bg-surface px-5 py-3 text-[15px] font-medium transition-colors hover:border-ink"
              >
                Check Your Own Answer
              </button>
            </div>
            <dl className="mt-12 grid max-w-[34rem] grid-cols-3 divide-x divide-hairline border-y border-hairline">
              {[
                { v: `${agree}/${total}`, l: "sentences match human labels" },
                { v: `${(avgMs / 1000).toFixed(1)} s`, l: "to check a full answer" },
                { v: usd(avgCost), l: "per answer at Jev pricing" },
              ].map((s) => (
                <div key={s.l} className="px-4 py-4 first:pl-0">
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="text-2xl font-semibold tracking-tight">{s.v}</dd>
                  <dd className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
          {saved[demos[0].id] && <HeroPreview result={saved[demos[0].id]} />}
        </section>

        <HowItWorks />

        <div className="mt-28">
          <Analyzer demos={demos} saved={saved} engine={engine} />
        </div>
      </main>

      <footer className="mt-28 grid gap-8 border-t border-hairline py-10 text-[13px] text-ink-2 md:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink" translate="no">
            <Logo /> Hallucinot
          </p>
          <p className="mt-3 max-w-xs leading-relaxed">
            Uses a typed decision model (<span translate="no">Jev</span> compatible) instead of asking a chatbot to grade a chatbot.
          </p>
        </div>
        <div>
          <p className="font-medium text-ink">Known limits</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed marker:text-muted">
            <li>Probabilities rank options well but are not proven to be calibrated, so you choose the review line.</li>
            <li>Arithmetic and dates are weak spots, such as whether “five weeks” is within 30 days.</li>
            <li>Each passage is judged on its own. A claim that needs two passages combined can show as “No source”.</li>
          </ul>
          <p className="mt-4 text-muted">Lumen Notes and Kestrel Analytics are fictional companies. The telescope facts are real; the AI’s mistakes are deliberate.</p>
        </div>
      </footer>
    </div>
  );
}

function HowItWorks() {
  const grid: [number, number][] = [
    [0.02, 0.97], [0.05, 0.02], [0.96, 0.01], [0.04, 0.03], [0.02, 0.01],
    [0.9, 0.02], [0.03, 0.01], [0.02, 0.05], [0.01, 0.02], [0.03, 0.88],
    [0.02, 0.01], [0.04, 0.02], [0.02, 0.01], [0.85, 0.03], [0.01, 0.02],
  ];
  const bars = [
    { w: 0.99, v: "contradicted" as const },
    { w: 0.96, v: "supported" as const },
    { w: 0.73, v: "supported" as const },
    { w: 0.94, v: "unsupported" as const },
  ];
  return (
    <section id="how" className="scroll-mt-6 border-t border-hairline pt-16" aria-labelledby="how-title">
      <div className="max-w-2xl">
        <h2 id="how-title" className="font-serif text-5xl tracking-tight text-balance">
          How it works
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-2 text-pretty">
          No chatbot grading a chatbot. Hallucinot asks a decision model hundreds of small multiple-choice questions and lets plain code add up the
          answers.
        </p>
      </div>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        <li className="rounded-xl border border-border bg-surface p-6">
          <div className="flex h-32 flex-col justify-center gap-2 rounded-lg bg-surface-2 p-4 text-[12px]" aria-hidden>
            <div className="flex flex-wrap gap-1">
              {["S1", "S2", "S3", "S4", "S5"].map((s) => (
                <span key={s} className="rounded bg-surface px-1.5 py-0.5 tabular-nums">
                  {s}
                </span>
              ))}
              <span className="px-1 text-muted">sentences</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {["P1", "P2", "P3"].map((s) => (
                <span key={s} className="rounded border border-border px-1.5 py-0.5 tabular-nums">
                  {s}
                </span>
              ))}
              <span className="px-1 text-muted">passages</span>
            </div>
          </div>
          <h3 className="mt-5 text-[16px] font-semibold">1. Split</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">The answer becomes sentences and the sources become passages. Greetings and sign-offs are set aside.</p>
        </li>
        <li className="rounded-xl border border-border bg-surface p-6">
          <div className="flex h-32 items-center gap-4 rounded-lg bg-surface-2 p-4">
            <div className="grid shrink-0 grid-cols-5 gap-[2px]" aria-hidden>
              {grid.map(([s, c], i) => (
                <span key={i} className="size-4 rounded-[2px]" style={{ background: evidenceColor(s, c) }} />
              ))}
            </div>
            <p className="font-serif text-[15px] leading-snug">“Does P2 support, contradict, or say nothing about S1?”</p>
          </div>
          <h3 className="mt-5 text-[16px] font-semibold">2. Ask every pair</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
            One typed question per sentence and passage, all in parallel. Each answer is a probability for every option, not a paragraph.
          </p>
        </li>
        <li className="rounded-xl border border-border bg-surface p-6">
          <div className="flex h-32 items-center rounded-lg bg-surface-2 px-4" aria-hidden>
            <div className="relative flex w-full flex-col gap-2">
              {bars.map((b, i) => (
                <span key={i} className="h-2.5 rounded-r-[3px]" style={{ width: `${b.w * 100}%`, background: VERDICT[b.v].color, opacity: b.w < 0.8 ? 0.4 : 1 }} />
              ))}
              <span className="absolute -inset-y-2 left-[80%] w-0.5 bg-ink" />
            </div>
          </div>
          <h3 className="mt-5 text-[16px] font-semibold">3. Decide</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
            Each sentence keeps its strongest evidence. Verdicts the engine is unsure about fall below your review line and go to a person.
          </p>
        </li>
      </ol>
    </section>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === "light" || set === "dark" ? set : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {}
        setTheme(next);
      }}
      aria-label={`Switch to ${next === "dark" ? "Dark" : "Light"} Theme`}
      title={`Switch to ${next} theme`}
      className="ml-1 grid size-9 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface hover:text-ink"
    >
      {theme === "dark" ? <Sun className="size-[18px]" /> : theme === "light" ? <Moon className="size-[18px]" /> : <span className="size-[18px]" />}
    </button>
  );
}
