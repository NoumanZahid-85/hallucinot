import { ImageResponse } from "next/og";

export const alt = "Alibi: find the sentences your AI made up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LINES = [
  { text: "Your notes stay safe on the Free plan.", hl: "#c5f2a8", line: "none", note: "Backed by a source", color: "#1e7b3c" },
  { text: "Refunds are open for 60 days.", hl: "#ffc9dd", line: "#c8283f", note: "Source says 30 days", color: "#c8283f" },
  { text: "We'll add a free month of Pro.", hl: "#ffe98a", line: "#8a6100", note: "No source mentions this", color: "#8a6100" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f2f4f7", padding: "64px 72px" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#172036" }}>Alibi</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 56 }}>
          {LINES.map((l) => (
            <div key={l.text} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 50,
                  color: "#172036",
                  background: l.hl,
                  padding: "2px 10px",
                  borderRadius: 8,
                  borderBottom: l.line === "none" ? "4px solid transparent" : `4px dashed ${l.line}`,
                }}
              >
                {l.text}
              </div>
              <div style={{ display: "flex", fontSize: 24, color: l.color }}>{l.note}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 28, color: "#545f75" }}>
          Check every sentence of an AI answer against its sources.
        </div>
      </div>
    ),
    size,
  );
}
