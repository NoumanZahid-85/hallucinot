<div align="center">

# Hallucinot

### Find the sentences your AI made up.

Your support bot just promised a customer a **60-day** refund. Your policy says **30**.<br/>
Hallucinot checks every sentence of an AI answer against every source passage and shows you exactly where it went wrong.

<br/>

<img src="docs/demo.gif" alt="Hallucinot: an AI answer marked sentence by sentence, with evidence lines, a confidence chart with a draggable review line, and an evidence heatmap" width="100%" />

<br/>

![Next.js 15](https://img.shields.io/badge/Next.js-15-0f1217?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-0f1217?logo=typescript&logoColor=white)
![Engine](https://img.shields.io/badge/engine-Jev%20%2F%20OpenJev-2a78d6)
![Deploy](https://img.shields.io/badge/deploy-Vercel-0f1217?logo=vercel)

</div>

## Why

RAG chatbots answer from your documents, and they still make things up. Checking by hand doesn't scale. Asking another LLM to grade the answer gives you a paragraph, not proof: it won't tell you which sentence is wrong, which passage proves it, or how sure it is.

## How

Hallucinot asks a decision model hundreds of tiny multiple-choice questions, one for every sentence × passage pair:

> Does this passage **support**, **contradict**, or **say nothing about** “Refunds are open for 60 days”?

A [Jev](https://typesafe.ai)-style model answers each one with a probability for every option, not prose. Plain code turns those probabilities into verdicts:

| | Verdict | Meaning |
|---|---|---|
| 🟦 | **Supported** | A passage states it or directly implies it |
| 🟥 | **Contradicted** | A passage says the opposite: a hallucination |
| 🟨 | **No source** | Nothing backs it up or rules it out |

## What you get

- **Answer and evidence board.** Every sentence is marked, and clicking one draws lines to the passages that support or contradict it.
- **Confidence chart.** One bar per claim, and the **review line is draggable right on the chart**. Anything below it goes to a person, and everything re-sorts instantly with no new API calls.
- **Source coverage.** See which documents backed claims, which contradicted them, and which were never used.
- **Evidence matrix.** A heatmap of every check, on a diverging red ← grey → blue scale.
- **Metrics:** groundedness, contradictions, unsourced claims, review queue, cost and latency.
- **Copy Report** as Markdown, **Export JSON**, a full results table, keyboard navigation (`←` `→` `N`), and light and dark themes.

Colors are checked for color blindness (the chart palette passes an automated CVD validator), and every verdict also has its own icon and underline style, so meaning never depends on color alone.

## Does it work?

These are real engine runs on the three built-in examples, scored against hand labels:

| Example | Checks | Time | Cost | Matches labels |
|---|---|---|---|---|
| Support bot | 72 | 2.5 s | $0.0006 | 9/9 |
| Space facts | 81 | 2.6 s | $0.0006 | 8/9 |
| HR policy | 80 | 3.3 s | $0.0006 | 9/10 |

**26 of 28 sentences are right, and both misses landed below the review line instead of being stated confidently.**

## Run it

```bash
git clone https://github.com/NoumanZahid-85/hallucinot.git && cd hallucinot
npm install
cp .env.example .env.local   # add your key
npm run dev
```

| Engine | `TYPESAFE_BASE_URL` | Cost |
|---|---|---|
| OpenJev on [codiv.ai](https://codiv.ai) | `https://api.codiv.ai` | Free tier |
| Jev by [TypeSafe](https://typesafe.ai) | `https://api.typesafe.ai` | $0.042 per 1M input tokens |

Set `TYPESAFE_API_KEY` too. No key yet? `JEV_ENGINE=mock npm run dev` runs an offline mock for UI work.

**Deploy:** import the repo on [Vercel](https://vercel.com/new) and add the two variables. The key stays on the server, and rate limits, input caps and retries are built in.

## Honest limits

- The probabilities rank options well, but they aren't proven to be calibrated. That's why you set the review line yourself.
- Math and dates are weak spots, such as checking whether "five weeks" is within 30 days.
- Each passage is judged on its own, so a claim that needs two passages combined can come back as "No source."

<sub>Built on the System One API from [TypeSafe](https://typesafe.ai), served free by [OpenJev](https://github.com/razorback16/openjev). The sample companies are fictional, and the space facts are real (the AI's mistakes are deliberate).</sub>
