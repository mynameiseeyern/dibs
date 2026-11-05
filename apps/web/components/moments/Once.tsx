"use client";

import { useEffect, useState } from "react";
import { Moment } from "./Moment";
import type { MomentKind } from "./plays";
import { buzz, HAPTICS, play, type SoundName } from "@/lib/feedback";

const SOUND: Record<MomentKind, SoundName> = { pop: "pop", lock: "locked", square: "square", paid: "paid" };

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
  width,
  after,
  still,
}: {
  id: string;
  kind: MomentKind;
  label: string;
  colour?: string;
  size?: number;
  width?: number;
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
    if (!seen && kind === "lock") buzz(HAPTICS.locked);
    // The tap that got here may already have played it.
    if (!seen) play(SOUND[kind], { within: 2000 });
  }, [key, kind]);

  if (state === "unknown") return <>{after}</>;
  if (state === "done") return <>{after}</>;
  return (
    <Moment
      kind={kind}
      label={label}
      colour={colour}
      size={size}
      width={width}
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
