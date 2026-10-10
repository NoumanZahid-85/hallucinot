import { ImageResponse } from "next/og";

export const alt = "Hallucinot: catch your AI making things up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LINES = [
  { text: "Your notes stay safe on the Free plan.", hl: "#cdf5df", line: "transparent", tag: "Backed", color: "#12965a" },
  { text: "Refunds are open for 60 days.", hl: "#ffd9db", line: "#e5484d", tag: "Contradicted", color: "#e5484d" },
  { text: "We'll add a free month of Pro.", hl: "#ffefb3", line: "#a86a12", tag: "No Source", color: "#a86a12" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f7f6fb", padding: "60px 72px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 52, height: 52, borderRadius: 14, background: "#6c3bff" }} />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#1d1a2f" }}>Hallucinot</div>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#1d1a2f", marginTop: 36, letterSpacing: -2 }}>
          Catch your AI making things up.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
          {LINES.map((l) => (
            <div key={l.text} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  color: "#1d1a2f",
                  background: l.hl,
                  padding: "2px 12px",
                  borderRadius: 10,
                  borderBottom: `3px dashed ${l.line}`,
                }}
              >
                {l.text}
              </div>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: l.color }}>{l.tag}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
