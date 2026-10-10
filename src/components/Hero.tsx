import { VERDICT_STYLE } from "./ui";
import type { Verdict } from "@/lib/types";

const SPECIMEN: { text: string; verdict: Verdict; note: string }[] = [
  { text: "Your notes stay safe on the Free plan.", verdict: "supported", note: "Backed by the help center" },
  { text: "Refunds are open for 60 days.", verdict: "contradicted", note: "The refund policy says 30 days" },
  { text: "We'll add a free month of Pro.", verdict: "unsupported", note: "No source mentions this" },
];

export function Hero({ onExample, onOwn }: { onExample: () => void; onOwn: () => void }) {
  return (
    <section className="pb-16 pt-10 sm:pb-24 sm:pt-16">
      <figure className="relative">
        <div className="space-y-6 sm:space-y-4">
          {SPECIMEN.map((line, i) => (
            <div key={line.text} className="grid items-baseline gap-x-8 gap-y-2.5 lg:grid-cols-[minmax(0,1fr)_15rem]">
              <p className="font-serif text-[2rem] leading-[1.25] tracking-[-0.01em] sm:text-5xl sm:leading-[1.2]">
                <span className={`${VERDICT_STYLE[line.verdict].mark} sweep`} style={{ animationDelay: `${250 + i * 550}ms` }}>
                  {line.text}
                </span>
              </p>
              <p
                className={`note-in flex items-baseline gap-2 text-sm lg:border-l lg:border-rule lg:pl-4 ${VERDICT_STYLE[line.verdict].text}`}
                style={{ animationDelay: `${650 + i * 550}ms` }}
              >
                <span className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${VERDICT_STYLE[line.verdict].dot}`} />
                {line.note}
              </p>
            </div>
          ))}
        </div>
        <figcaption className="sr-only">
          An example chatbot answer, marked up: one sentence is backed, one is contradicted by its source, one has no source.
        </figcaption>
      </figure>

      <div className="mt-12 grid gap-8 border-t border-rule pt-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-x-8">
        <div className="max-w-[38rem]">
          <h1 className="text-2xl font-semibold leading-snug tracking-[-0.01em] sm:text-[1.75rem]">
            Alibi finds the sentences your AI made up.
          </h1>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">
            Paste an AI answer and the documents it should come from. Alibi checks every sentence against every passage in a few
            seconds, then marks what is backed, what is contradicted, and what has no source at all.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onExample}
              className="rounded-lg bg-ink px-5 py-2.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              Check an example
            </button>
            <button
              onClick={onOwn}
              className="rounded-lg border border-ink/25 px-5 py-2.5 text-[15px] font-medium transition-colors hover:border-ink"
            >
              Check your own text
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
