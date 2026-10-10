// Runs every demo through the real engine (via a running dev server) and saves
// the results to src/data/demo-results.json, so visitors see real output
// without spending API quota.
//
//   npm run dev            (in one terminal)
//   npm run seed           (in another)
//
// Optional: npm run seed -- http://localhost:3001  |  --allow-mock
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEMOS } from "../src/data/demos.ts";
import { judge } from "../src/lib/verdict.ts";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const allowMock = args.includes("--allow-mock");
const outFile = fileURLToPath(new URL("../src/data/demo-results.json", import.meta.url));
const saved = JSON.parse(readFileSync(outFile, "utf8"));

const verdict = (result, s) => judge(result, s, 0.8).verdict;

let failed = 0;
for (const demo of DEMOS) {
  process.stdout.write(`${demo.id.padEnd(12)} `);
  try {
    const res = await fetch(`${base}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: demo.question, answer: demo.answer, sources: demo.sources }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    if (data.meta.model === "mock" && !allowMock) throw new Error("engine is the offline mock; refusing to save (use --allow-mock)");

    const agree = demo.labels.filter((l, s) => verdict(data, s) === l).length;
    saved[demo.id] = data;
    console.log(`ok  ${data.meta.engine} · ${data.meta.ms} ms · ${data.meta.inputTokens} tokens · agrees with labels ${agree}/${demo.labels.length}`);
    demo.labels.forEach((l, s) => {
      const v = verdict(data, s);
      if (v !== l) console.log(`    S${s + 1}: engine=${v} label=${l}  "${data.sentences[s].text.slice(0, 70)}"`);
    });
  } catch (e) {
    failed++;
    console.log(`FAILED  ${e.message}`);
  }
}

writeFileSync(outFile, JSON.stringify(saved, null, 2) + "\n");
console.log(`\nSaved ${Object.keys(saved).length} result(s) to src/data/demo-results.json`);
process.exitCode = failed ? 1 : 0;
