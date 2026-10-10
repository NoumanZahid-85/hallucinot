"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CheckResult, Demo } from "@/lib/types";
import { Gauge, Logo, Moon, Question, Scissors, Sun } from "./Icons";
import { Playground } from "./Playground";

interface Props {
  demos: Demo[];
  saved: Record<string, CheckResult>;
  engine: { label: string; configured: boolean };
}

export function App({ demos, saved, engine }: Props) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-5">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg font-display text-xl font-extrabold tracking-tight" translate="no">
          <Logo /> Hallucinot
        </Link>
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm sm:flex"
            title={engine.configured ? `Live checks run on ${engine.label}` : "Live checks are off"}
          >
            <span className={`size-2 rounded-full ${engine.configured ? "bg-backed" : "bg-unsourced"}`} />
            {engine.configured ? "Live" : "Examples Only"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section className="pb-10 pt-8 text-center sm:pb-12 sm:pt-14">
          <h1 className="mx-auto max-w-3xl font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-balance sm:text-7xl">
            Catch Your AI Making Things&nbsp;Up
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted text-pretty">Pick an answer, flag what looks fake, then check it against the sources.</p>
        </section>

        <Playground demos={demos} saved={saved} engine={engine} />

        <section className="mt-24" aria-labelledby="how">
          <h2 id="how" className="text-center font-display text-2xl font-bold tracking-tight text-balance">
            How It Works
          </h2>
          <ol className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { Icon: Scissors, title: "Split", text: "Answer into sentences, sources into passages" },
              { Icon: Question, title: "Ask", text: "Back, contradict, or silent? For every pair" },
              { Icon: Gauge, title: "Score", text: "Each sentence keeps its strongest evidence" },
            ].map(({ Icon, title, text }, i) => (
              <li key={title} className="rounded-3xl border border-line bg-card p-5 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 font-display text-lg font-bold">
                  {i + 1}. {title}
                </p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mt-20 border-t border-line py-8 text-center text-sm text-muted">
        Built with typed decisions from <span translate="no">Jev</span>-compatible models. Sample companies are fictional.
      </footer>
    </div>
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
      className="grid size-10 place-items-center rounded-full border border-line bg-card text-muted transition-colors hover:border-brand hover:text-brand"
    >
      {theme === "dark" ? <Sun className="size-5" /> : theme === "light" ? <Moon className="size-5" /> : <span className="size-5" />}
    </button>
  );
}
