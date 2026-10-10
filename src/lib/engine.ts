// Server-side only: talks to any TypeSafe-compatible System One endpoint
// (TypeSafe's Jev, OpenJev on codiv.ai, or Vercel AI Gateway) via plain fetch.
import type { CheckResult, Passage, Relation } from "./types";
import { splitPassages, splitSentences } from "./split";

const JEV_PRICE_PER_TOKEN = 0.042 / 1_000_000;
const CONCURRENCY = 6;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 25_000;

type NoulQ = { type: "noul"; instructions: string };
type ChoiceQ = { type: "choice"; instructions: string; criteria: Record<string, string> };
type Question = NoulQ | ChoiceQ;

interface SystemOneResponse {
  model?: string;
  answers: Record<string, { noul?: number; probabilities?: Record<string, number> }>;
  usage?: { input_tokens?: number };
}

// Worded so the engine judges the passage alone: without "only outside knowledge"
// guidance it marked "The Eiffel Tower is in Berlin" as contradicted by a passage
// that only gives the completion date.
const RELATION_CRITERIA: Record<Relation, string> = {
  supports: "The passage itself states the claim or directly implies that it is true.",
  contradicts: "The passage itself states something that cannot be true at the same time as the claim.",
  says_nothing: "The passage does not address what the claim is about. Use this when only outside knowledge could settle it.",
};

export class EngineError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function engineConfig() {
  const mock = process.env.JEV_ENGINE === "mock";
  const baseUrl = (process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai").replace(/\/+$/, "");
  const model = process.env.TYPESAFE_MODEL || "jev-latest";
  const host = mock ? "mock" : new URL(baseUrl).host;
  const label = mock
    ? "Offline mock (not Jev)"
    : host.includes("codiv")
      ? "OpenJev on codiv.ai"
      : host.includes("vercel")
        ? "Jev on Vercel AI Gateway"
        : host.includes("typesafe")
          ? "Jev by TypeSafe"
          : `System One at ${host}`;
  return { mock, baseUrl, model, label, configured: mock || !!process.env.TYPESAFE_API_KEY };
}

async function systemOne(state: string, questions: Record<string, Question>): Promise<SystemOneResponse> {
  const { baseUrl, model } = engineConfig();
  let lastError: EngineError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1) + Math.random() * 250));
    }
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/v1/systemone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, state, questions }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      lastError = new EngineError("The decision engine did not respond in time.", 504);
      continue;
    }
    if (res.ok) return res.json();

    const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
    lastError = new EngineError(
      res.status === 401 || res.status === 403
        ? "The engine rejected the API key. Check TYPESAFE_API_KEY and TYPESAFE_BASE_URL."
        : retryable
          ? "The decision engine is busy right now. Try again in a minute, or open one of the saved demos."
          : `The engine refused the request (HTTP ${res.status}).`,
      retryable ? 503 : res.status === 401 || res.status === 403 ? 502 : 400,
    );
    if (!retryable) break;
  }
  throw lastError!;
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

function claimInstruction(question: string, sentences: string[], s: number) {
  const prev = s > 0 ? ` (The sentence before it, for context only: "${sentences[s - 1]}")` : "";
  return (
    `An AI assistant was asked: "${question}". One sentence of its answer is: "${sentences[s]}".${prev} ` +
    `Judge only from what the passage says, not from general knowledge. ` +
    `How does the passage relate to the factual claim made in that sentence?`
  );
}

export async function runCheck(question: string, answer: string, sources: string): Promise<CheckResult> {
  const sentences = splitSentences(answer);
  const passages = splitPassages(sources);
  const { mock, label, model } = engineConfig();
  const started = Date.now();

  if (mock) return mockCheck(question, sentences, passages, label, started);

  // One call per passage: the passage is the state, and every answer sentence is
  // an independent Choice question against it (supports / contradicts / says nothing).
  const perPassage = passages.map((p) => ({
    state: `Source passage from "${p.doc}":\n${p.text}`,
    questions: Object.fromEntries(
      sentences.map((_, s) => [
        `s${s}`,
        { type: "choice", instructions: claimInstruction(question, sentences, s), criteria: RELATION_CRITERIA },
      ]),
    ) as Record<string, Question>,
  }));

  // Plus one call that filters out greetings and filler, so they are not scored.
  // Quote each sentence instead of referring to it by number: index lookups
  // ("sentence [9]") proved unreliable for the last sentences of an answer.
  const claimCall = {
    state: `An AI assistant's answer:\n${sentences.join(" ")}`,
    questions: Object.fromEntries(
      sentences.map((text, s) => [
        `k${s}`,
        {
          type: "noul",
          instructions:
            `Consider this sentence from the answer: "${text}". Does it make a factual claim that could be checked ` +
            `against reference documents, rather than being a greeting, apology, sign-off or offer of help?`,
        },
      ]),
    ) as Record<string, Question>,
  };

  const calls = [...perPassage, claimCall];
  const responses = await pool(calls, CONCURRENCY, (c) => systemOne(c.state, c.questions));
  const claimRes = responses[responses.length - 1];

  const cells = sentences.map((_, s) =>
    passages.map((_, p) => {
      const probs = responses[p].answers[`s${s}`]?.probabilities ?? {};
      const sup = probs.supports ?? 0;
      const con = probs.contradicts ?? 0;
      const none = probs.says_nothing ?? Math.max(0, 1 - sup - con);
      return [sup, con, none] as [number, number, number];
    }),
  );

  const inputTokens = responses.reduce((n, r) => n + (r.usage?.input_tokens ?? 0), 0);
  return {
    question,
    sentences: sentences.map((text, i) => ({ i, text, claim: claimRes.answers[`k${i}`]?.noul ?? 1 })),
    passages,
    cells,
    meta: {
      engine: label,
      model: responses[0]?.model ?? model,
      calls: calls.length,
      questions: sentences.length * passages.length + sentences.length,
      inputTokens,
      ms: Date.now() - started,
      listPriceUsd: inputTokens * JEV_PRICE_PER_TOKEN,
      createdAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Offline mock for UI development without an API key (JEV_ENGINE=mock).
// A crude word-overlap heuristic. Its output is labelled as not being Jev.

const STOP = new Set(
  "the a an and or of to in on at for is are was were be been it its this that with as by from your you we our can will all any not".split(" "),
);
const words = (t: string) =>
  t.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => !STOP.has(w) && w.length > 2) ?? [];

function mockCheck(question: string, sentences: string[], passages: Passage[], label: string, started: number): CheckResult {
  const cells = sentences.map((s) => {
    const sw = new Set(words(s));
    return passages.map((p) => {
      const pw = new Set(words(p.text));
      const overlap = [...sw].filter((w) => pw.has(w)).length / Math.max(1, sw.size);
      const nums = (t: string) => new Set(t.match(/\d+/g) ?? []);
      const sn = nums(s);
      const clash = overlap > 0.3 && sn.size > 0 && [...sn].some((n) => !nums(p.text).has(n));
      const sup = clash ? 0.1 : Math.min(0.95, overlap * 1.4);
      const con = clash ? Math.min(0.9, overlap * 1.6) : 0.03;
      return [sup, con, Math.max(0, 1 - sup - con)] as [number, number, number];
    });
  });
  return {
    question,
    sentences: sentences.map((text, i) => ({ i, text, claim: /[!]$|^(thanks|let me know|congrat)/i.test(text) ? 0.1 : 0.9 })),
    passages,
    cells,
    meta: {
      engine: label,
      model: "mock",
      calls: passages.length + 1,
      questions: sentences.length * passages.length + sentences.length,
      inputTokens: 0,
      ms: Date.now() - started,
      listPriceUsd: 0,
      createdAt: new Date().toISOString(),
    },
  };
}
