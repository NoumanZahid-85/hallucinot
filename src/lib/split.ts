import type { Passage } from "./types";

export const LIMITS = {
  answerChars: 3000,
  sourceChars: 14000,
  questionChars: 400,
  sentences: 20,
  passages: 24,
};

const MAX_PASSAGE_WORDS = 90;

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("en", { granularity: "sentence" })
    : null;

export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = segmenter
    ? Array.from(segmenter.segment(clean), (s) => s.segment.trim())
    : clean.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
  // The segmenter splits after initials and abbreviations ("James E. Webb").
  const merged: string[] = [];
  for (const part of parts.filter(Boolean)) {
    const prev = merged[merged.length - 1];
    if (prev && ABBREVIATION_END.test(prev)) merged[merged.length - 1] = `${prev} ${part}`;
    else merged.push(part);
  }
  return merged;
}

const ABBREVIATION_END = /(?:^|\s)(?:[A-Z]|Mr|Mrs|Ms|Dr|Prof|St|No|vs|e\.g|i\.e|U\.S|approx)\.$/;

/**
 * Sources are plain text. A line starting with "# " starts a new document;
 * blank lines separate paragraphs. Long paragraphs are cut at sentence
 * boundaries so every passage stays small enough to judge on its own.
 */
export function splitPassages(sources: string): Passage[] {
  const passages: Passage[] = [];
  let doc = "Source";
  let para: string[] = [];

  const flush = () => {
    const text = para.join(" ").replace(/\s+/g, " ").trim();
    para = [];
    if (!text) return;
    let buf: string[] = [];
    let words = 0;
    for (const s of splitSentences(text)) {
      const n = s.split(" ").length;
      if (buf.length && words + n > MAX_PASSAGE_WORDS) {
        passages.push({ i: passages.length, doc, text: buf.join(" ") });
        buf = [];
        words = 0;
      }
      buf.push(s);
      words += n;
    }
    if (buf.length) passages.push({ i: passages.length, doc, text: buf.join(" ") });
  };

  for (const line of sources.split(/\r?\n/)) {
    const heading = line.match(/^#+\s+(.*)$/);
    if (heading) {
      flush();
      doc = heading[1].trim() || "Source";
    } else if (!line.trim()) {
      flush();
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return passages;
}
