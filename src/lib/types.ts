export type Relation = "supports" | "contradicts" | "says_nothing";

export const RELATIONS: Relation[] = ["supports", "contradicts", "says_nothing"];

export interface Passage {
  i: number;
  doc: string;
  text: string;
}

export interface Sentence {
  i: number;
  text: string;
  /** Probability that the sentence is a checkable factual claim (vs. greeting/filler). */
  claim: number;
}

export interface CheckMeta {
  engine: string;
  model: string;
  calls: number;
  questions: number;
  inputTokens: number;
  ms: number;
  /** What the run would cost at Jev's list price ($0.042 / 1M input tokens). */
  listPriceUsd: number;
  createdAt: string;
}

export interface CheckResult {
  question: string;
  sentences: Sentence[];
  passages: Passage[];
  /** cells[s][p] = [supports, contradicts, says_nothing] probabilities. */
  cells: [number, number, number][][];
  meta: CheckMeta;
}

export type Verdict = "supported" | "contradicted" | "unsupported" | "not_claim";

export interface Demo {
  id: string;
  label: string;
  blurb: string;
  question: string;
  answer: string;
  sources: string;
  /** Hand labels, one per sentence, used to score the engine. */
  labels: Verdict[];
}
