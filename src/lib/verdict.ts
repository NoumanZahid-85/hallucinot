import type { CheckResult, Verdict } from "./types";

export interface Judgement {
  verdict: Verdict;
  /** How sure the engine is about this verdict, 0..1. */
  confidence: number;
  /** Passage that decided the verdict (best source or strongest contradiction). */
  passage: number | null;
  needsReview: boolean;
}

const CLAIM_CUTOFF = 0.5;
const DECISION_CUTOFF = 0.5;
/** Filler can't be strongly backed or refuted by a source, so strong evidence overrules the claim filter. */
const EVIDENCE_OVERRIDE = 0.7;

export function judge(result: CheckResult, s: number, autoAccept: number): Judgement {
  let bestSup = 0, supAt = -1, bestCon = 0, conAt = -1;
  result.cells[s].forEach(([sup, con], p) => {
    if (sup > bestSup) [bestSup, supAt] = [sup, p];
    if (con > bestCon) [bestCon, conAt] = [con, p];
  });

  const claim = result.sentences[s].claim;
  if (claim < CLAIM_CUTOFF && Math.max(bestSup, bestCon) < EVIDENCE_OVERRIDE) {
    return { verdict: "not_claim", confidence: 1 - claim, passage: null, needsReview: false };
  }

  let verdict: Verdict, confidence: number, passage: number | null;
  if (bestCon >= DECISION_CUTOFF && bestCon > bestSup) {
    [verdict, confidence, passage] = ["contradicted", bestCon, conAt];
  } else if (bestSup >= DECISION_CUTOFF) {
    [verdict, confidence, passage] = ["supported", bestSup, supAt];
  } else {
    // No passage clearly backs or refutes it: the claim has no source.
    [verdict, confidence, passage] = ["unsupported", 1 - Math.max(bestSup, bestCon), supAt >= 0 ? supAt : null];
  }
  return { verdict, confidence, passage, needsReview: confidence < autoAccept };
}

export function judgeAll(result: CheckResult, autoAccept: number) {
  return result.sentences.map((_, s) => judge(result, s, autoAccept));
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  supported: "Backed",
  contradicted: "Contradicted",
  unsupported: "No Source",
  not_claim: "Not a Claim",
};
