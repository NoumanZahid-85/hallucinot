import { ImageResponse } from "next/og";

export const alt = "Receipts: a hallucination heatmap for AI answers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRID = [
  [0.95, 0.1, 0.05, 0.1, 0.05, 0.1],
  [-0.97, 0.1, 0.05, 0.05, 0.1, 0.05],
  [0.05, 0.1, 0.92, 0.05, 0.05, 0.1],
  [0.1, 0.05, 0.05, 0.9, 0.6, 0.05],
  [0.05, 0.05, 0.1, 0.05, 0.05, 0.1],
  [0.05, -0.9, 0.05, 0.1, 0.05, 0.98],
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#f5f3ee", padding: 72, gap: 64, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 30, color: "#6d6a62", letterSpacing: 6 }}>RECEIPTS</div>
          <div style={{ fontSize: 66, fontWeight: 700, color: "#1b1a17", lineHeight: 1.1, marginTop: 20 }}>
            Every sentence an AI writes should come with a receipt.
          </div>
          <div style={{ fontSize: 28, color: "#6d6a62", marginTop: 28 }}>
            Sentence × source fact-checking with typed decisions
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GRID.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 10 }}>
              {row.map((v, c) => (
                <div
                  key={c}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 6,
                    background: v < 0 ? `rgba(210,49,43,${-v})` : `rgba(22,128,60,${Math.max(0.08, v)})`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
