import { EngineError, engineConfig, runCheck } from "@/lib/engine";
import { LIMITS, splitPassages, splitSentences } from "@/lib/split";

export const runtime = "nodejs";
export const maxDuration = 60;

// Best-effort per-IP limit. Serverless instances don't share memory, so this
// slows down abuse rather than enforcing a hard global quota.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_10_MIN || 8);
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  if (!engineConfig().configured) {
    return fail("This deployment has no engine key configured yet. The saved demos still work.", 503);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) {
    return fail("You've run a lot of checks in a short time. Take a 10-minute break, or explore the saved demos.", 429);
  }

  let body: { question?: unknown; answer?: unknown; sources?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const sources = typeof body.sources === "string" ? body.sources.trim() : "";

  if (!answer || !sources) return fail("Paste both an AI answer and the sources it should be based on.", 400);
  if (question.length > LIMITS.questionChars) return fail(`Keep the question under ${LIMITS.questionChars} characters.`, 400);
  if (answer.length > LIMITS.answerChars) return fail(`Keep the answer under ${LIMITS.answerChars} characters.`, 400);
  if (sources.length > LIMITS.sourceChars) return fail(`Keep the sources under ${LIMITS.sourceChars} characters.`, 400);
  if (splitSentences(answer).length > LIMITS.sentences) return fail(`Keep the answer to ${LIMITS.sentences} sentences or fewer.`, 400);
  if (splitPassages(sources).length > LIMITS.passages) return fail(`Keep the sources to ${LIMITS.passages} passages or fewer.`, 400);

  try {
    const result = await runCheck(question || "(no question given)", answer, sources);
    return Response.json(result);
  } catch (err) {
    if (err instanceof EngineError) return fail(err.message, err.status);
    console.error(err);
    return fail("Something went wrong while checking. Please try again.", 500);
  }
}
