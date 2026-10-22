"use client";

import { useOptimistic, useTransition } from "react";
import type { Vibe } from "@dibs/shared/types";

export const VIBE_OPTIONS = [
  // The note is Dibby saying the same thing in that voice, so you can hear the difference.
  { id: "chill", name: "Chill", note: "\u201cYou in?\u201d" },
  { id: "extra", name: "Extra", note: "\u201cyou in?? \ud83d\udc40\u201d" },
  { id: "straight", name: "Straight up", note: "\u201cAre you going?\u201d" },
] as const;

/**
 * Pick a vibe. Inside a form it's a plain radio group (name="vibe").
 * With `onChange` it switches straight away, for the plan's edit screen.
 */
export function VibePick({ value = "chill", onChange, onPick }: { value?: Vibe; onChange?: (v: Vibe) => Promise<void>; onPick?: (v: Vibe) => void }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  return (
    <div className="vibe-pick" role="radiogroup" aria-label="How Dibby talks" aria-busy={pending}>
      {VIBE_OPTIONS.map((v) => (
        <label key={v.id}>
          <input
            type="radio"
            name="vibe"
            value={v.id}
            {...(onChange
              ? {
                  checked: shown === v.id,
                  onChange: () =>
                    start(async () => {
                      setShown(v.id);
                      await onChange(v.id);
                    }),
                }
              : { defaultChecked: value === v.id, onChange: () => onPick?.(v.id) })}
          />
          <span>
            {v.name}
            <small>{v.note}</small>
          </span>
        </label>
      ))}
    </div>
  );
}
