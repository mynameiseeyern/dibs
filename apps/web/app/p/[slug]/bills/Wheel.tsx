"use client";

import { useEffect, useState } from "react";

const FILLS = ["var(--accent-base)", "var(--primary-light)", "var(--away-light)", "var(--success-light)", "var(--highlighted-light)", "var(--information-light)"];

/**
 * The card-roulette wheel. The loser is decided on the server before this draws;
 * when `spin` is set it plays a few turns and lands the loser under the pointer.
 */
export function Wheel({ names, loserIndex, spin }: { names: string[]; loserIndex: number | null; spin: boolean }) {
  const n = Math.max(names.length, 1);
  const seg = 360 / n;
  // Rotation that puts the middle of segment i at the top.
  const restFor = (i: number) => -(i * seg + seg / 2);
  const target = loserIndex === null ? restFor(0) : restFor(loserIndex);
  const [rot, setRot] = useState(spin ? target + 1440 : target);

  useEffect(() => {
    if (!spin) return;
    const t = requestAnimationFrame(() => setRot(target - 1440));
    return () => cancelAnimationFrame(t);
  }, [spin, target]);

  const r = 125;
  const pt = (deg: number, rad: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [130 + rad * Math.cos(a), 130 + rad * Math.sin(a)] as const;
  };

  return (
    <div className="wheel" role="img" aria-label={loserIndex === null ? `Wheel with ${names.join(", ")}` : `The wheel landed on ${names[loserIndex]}`}>
      <div className="wheel__pointer" aria-hidden="true" />
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
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${-rot} ${lx} ${ly})`} fontFamily="var(--font-sans)" fontWeight="800" fontSize="17" fill="#141216">
                  {name}
                </text>
              </g>
            );
          })
        )}
        <circle cx="130" cy="130" r="22" fill="var(--bg-strong-950)" />
        <circle cx="130" cy="130" r="8" fill="var(--accent-base)" />
      </svg>
    </div>
  );
}
