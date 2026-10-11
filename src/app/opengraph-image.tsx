import { ImageResponse } from "next/og";

export const alt = "Hallucinot: find the sentences your AI made up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BLUE = "#2a78d6", RED = "#d03b3b", AMBER = "#eda100", GREY = "#e9ecf0", INK = "#0f1217";
// A small evidence matrix: B = supports, R = contradicts, . = says nothing.
const MATRIX = ["R......", "..B....", "...BB..", "...R...", ".....B.", "......R", "B......"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#f5f6f8", padding: 64, gap: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 44, height: 44, borderRadius: 11, background: INK }} />
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: INK }}>Hallucinot</div>
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: INK, lineHeight: 1.05, marginTop: 56, letterSpacing: -2 }}>
            Find the sentences your AI made up.
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#4a515e", marginTop: 28 }}>Every sentence checked against every source passage.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 28, width: 360 }}>
          <div style={{ display: "flex", flexDirection: "column", background: "#fff", borderRadius: 20, padding: 28, gap: 14 }}>
            <div style={{ display: "flex", fontSize: 22, color: "#4a515e" }}>Groundedness</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: INK }}>43%</div>
            <div style={{ display: "flex", height: 14, gap: 3 }}>
              <div style={{ display: "flex", flex: 3, background: BLUE, borderRadius: 4 }} />
              <div style={{ display: "flex", flex: 3, background: RED, borderRadius: 4 }} />
              <div style={{ display: "flex", flex: 1, background: AMBER, borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, background: "#fff", borderRadius: 20, padding: 28 }}>
            {MATRIX.map((row, r) => (
              <div key={r} style={{ display: "flex", gap: 5 }}>
                {row.split("").map((c, i) => (
                  <div key={i} style={{ display: "flex", width: 38, height: 22, borderRadius: 4, background: c === "B" ? BLUE : c === "R" ? RED : GREY }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
