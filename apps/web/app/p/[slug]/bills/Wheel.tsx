"use client";

import { useEffect } from "react";

const FILLS = ["var(--accent-base)", "var(--primary-light)", "var(--away-light)", "var(--success-light)", "var(--highlighted-light)", "var(--information-light)"];
const SPIN_MS = 4000;

/**
 * The card-roulette wheel. The loser is decided on the server; this only draws it.
 * - idle: nobody's spun yet, wheel at rest.
 * - suspense: about to spin, parked a little off the result so it doesn't give it away.
 * - spin: five turns, landing the loser under the pointer, then calls onLanded.
 * - landed: sitting on the loser.
 */
export type WheelMode = "idle" | "suspense" | "spin" | "landed";

export function Wheel({
  names,
  loserIndex,
  mode,
  onLanded,
}: {
  names: string[];
  loserIndex: number | null;
  mode: WheelMode;
  onLanded?: () => void;
}) {
  const n = Math.max(names.length, 1);
  const seg = 360 / n;
  // Rotation that puts the middle of segment i at the top.
  const restFor = (i: number) => -(i * seg + seg / 2);
  const target = loserIndex === null ? restFor(0) : restFor(loserIndex);
  const rot = mode === "idle" ? restFor(0) : mode === "suspense" ? target + seg * 0.5 + 140 : mode === "spin" ? target - 1800 : target;

  useEffect(() => {
    if (mode !== "spin") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => onLanded?.(), reduced ? 0 : SPIN_MS + 150);
    return () => clearTimeout(t);
  }, [mode, onLanded]);

  const r = 125;
  const pt = (deg: number, rad: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [130 + rad * Math.cos(a), 130 + rad * Math.sin(a)] as const;
  };
  const label =
    loserIndex === null || mode !== "landed" ? `Wheel with ${names.join(", ")}` : `The wheel landed on ${names[loserIndex]}`;

  return (
    <div className={`wheel${mode === "spin" ? " wheel--moving" : ""}`} role="img" aria-label={label}>
      {/* The clay rim, hub and pointer sit still; the wedges spin underneath. */}
      <img className="wheel__frame" src="/crew/wheel-frame.png" alt="" aria-hidden="true" draggable={false} />
      <svg viewBox="0 0 260 260" style={{ transform: `rotate(${rot}deg)` }} aria-hidden="true">
        {names.length < 2 ? (
          <circle cx="130" cy="130" r={r} fill="var(--bg-soft-200)" stroke="var(--stroke-strong-950)" strokeWidth="2" />
        ) : (
          names.map((name, i) => {
            const [x0, y0] = pt(i * seg, r);
            const [x1, y1] = pt((i + 1) * seg, r);
            const [lx, ly] = pt(i * seg + seg / 2, 82);
            const large = seg > 180 ? 1 : 0;
            return (
              <g key={i}>
                <path d={`M130 130 L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`} fill={FILLS[i % FILLS.length]} stroke="var(--stroke-strong-950)" strokeWidth="2" />
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${-rot} ${lx} ${ly})`} fontFamily="var(--font-sans)" fontWeight="800" fontSize="17" fill="var(--static-black)">
                  {name}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}
