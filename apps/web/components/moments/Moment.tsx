"use client";

import { useEffect, useRef, useState } from "react";
import type { MomentKind } from "./plays";

/**
 * One of the Dibs 3D moments, played once when it mounts. Three.js loads only here,
 * and only when a moment actually plays, so the plan page stays light from a WhatsApp link.
 * Under reduced motion it shows the still (children) and fades in.
 */
export function Moment({
  kind,
  size = 160,
  colour,
  label,
  onDone,
  children,
}: {
  kind: MomentKind;
  size?: number;
  colour?: string;
  label: string;
  onDone?: () => void;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !ref.current) {
      setStill(true);
      onDone?.();
      return;
    }
    let dispose = () => {};
    let gone = false;
    import("./plays").then(({ play }) => {
      if (gone || !ref.current) return;
      const run = play(kind, ref.current, size, colour);
      dispose = run.dispose;
      run.done.then(() => onDone?.());
    });
    return () => {
      gone = true;
      dispose();
    };
    // Plays once per mount on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="moment3d" style={{ width: size, height: size }} role="img" aria-label={label}>
      {still ? <div className="moment3d__still">{children}</div> : <canvas ref={ref} width={size} height={size} />}
    </div>
  );
}
