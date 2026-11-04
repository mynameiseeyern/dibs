"use client";

import { Dibby, type DibbyMood, type DibbySize } from "./Dibby";
import "./dibby-live.css";

/**
 * What Dibby's doing in the chat, from what the person's doing. The chat sets the state; this
 * picks the pose and the small move that goes with it.
 *
 * - idle: nothing's happening, Dibby breathes
 * - attentive: the box has the cursor, Dibby looks at it
 * - listening: typing, Dibby nods along (`beat` changes on keystrokes, a nod each time)
 * - waiting: stopped typing mid-message, head tilt
 * - thinking: a message was sent, Dibby's reading it
 * - talking: Dibby's message just landed
 * - working: making the plan
 * - cheer / oops: it worked / it didn't
 *
 * Built from the stills and clips in public/dibby for now. Swap a pose for a real clip (or a Rive
 * state machine) here and the chat doesn't change. Reduced motion: the pose, no moves.
 */
export type DibbyState = "idle" | "attentive" | "listening" | "waiting" | "thinking" | "talking" | "working" | "cheer" | "oops";

const POSE: Record<DibbyState, DibbyMood> = {
  idle: "hi",
  attentive: "look",
  listening: "look",
  waiting: "wait",
  thinking: "thinking",
  talking: "point",
  working: "loading",
  cheer: "cheer",
  oops: "oops",
};

const SAYS: Record<DibbyState, string> = {
  idle: "Dibby",
  attentive: "Dibby is listening",
  listening: "Dibby is listening",
  waiting: "Dibby is waiting for you",
  thinking: "Dibby is thinking",
  talking: "Dibby",
  working: "Dibby is making the plan",
  cheer: "Dibby is stoked",
  oops: "Dibby hit a snag",
};

export function DibbyLive({ state, beat = 0, size = "xs", className }: { state: DibbyState; beat?: number; size?: DibbySize; className?: string }) {
  const pose = POSE[state];
  return (
    <span className={`dl dl--${state} dl--${size}${className ? ` ${className}` : ""}`} role="img" aria-label={SAYS[state]}>
      {/* The nod restarts by swapping between two identical animations, so the image never reloads. */}
      <span className={`dl__move${state === "listening" ? (beat % 2 ? " dl__move--nod-a" : " dl__move--nod-b") : ""}`}>
        {/* A new pose pops in; the same pose (attentive → listening) just keeps going. */}
        <span className="dl__pose" key={pose}>
          <Dibby mood={pose} size={size} />
        </span>
      </span>
    </span>
  );
}
