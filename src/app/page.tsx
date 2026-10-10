import { App } from "@/components/App";
import { DEMOS } from "@/data/demos";
import savedResults from "@/data/demo-results.json";
import { engineConfig } from "@/lib/engine";
import type { CheckResult } from "@/lib/types";

export default function Home() {
  const { label, configured } = engineConfig();
  return <App demos={DEMOS} saved={savedResults as unknown as Record<string, CheckResult>} engine={{ label, configured }} />;
}
