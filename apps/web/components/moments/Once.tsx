"use client";

import { useEffect, useState } from "react";
import { Moment } from "./Moment";
import type { MomentKind } from "./plays";

/**
 * Plays a moment the first time this browser sees a given state (keyed), then never again.
 * The last frame stays on screen so the page doesn't jump; later visits render `after`
 * (usually nothing) straight away.
 */
export function Once({
  id,
  kind,
  label,
  colour,
  size,
  after,
  still,
}: {
  id: string;
  kind: MomentKind;
  label: string;
  colour?: string;
  size?: number;
  after?: React.ReactNode;
  still?: React.ReactNode;
}) {
  const key = `dibs:moment:${id}`;
  const [state, setState] = useState<"unknown" | "play" | "done">("unknown");

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
    } catch {}
    setState(seen ? "done" : "play");
  }, [key]);

  if (state === "unknown") return <>{after}</>;
  if (state === "done") return <>{after}</>;
  return (
    <Moment
      kind={kind}
      label={label}
      colour={colour}
      size={size}
      onDone={() => {
        try {
          localStorage.setItem(key, "1");
        } catch {}
        // Keep the final frame; nothing to swap to.
      }}
    >
      {still}
    </Moment>
  );
}
