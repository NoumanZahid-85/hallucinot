"use client";

import { useState, type ReactNode } from "react";

/**
 * One tooltip per chart. Pointer and keyboard focus show the same content.
 * Content is React nodes, so labels from user text are escaped automatically.
 */
export function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

  const show = (e: React.PointerEvent | React.FocusEvent, content: ReactNode) => {
    if ("clientX" in e && e.pointerType) {
      setTip({ x: e.clientX, y: e.clientY, content });
    } else {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTip({ x: r.left + r.width / 2, y: r.bottom, content });
    }
  };
  const hide = () => setTip(null);

  const node = tip && (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-max max-w-[18rem] rounded-lg border border-border bg-surface px-3 py-2 text-[13px] leading-snug text-ink shadow-[0_8px_30px_-10px_rgba(0,0,0,0.35)]"
      style={{
        left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 300),
        top: tip.y + 16,
      }}
    >
      {tip.content}
    </div>
  );

  return { show, hide, node };
}

/** Tooltip row: value leads, label follows, keyed by a short line in the mark's colour. */
export function TipRow({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-ink-2">{label}</span>
    </div>
  );
}
