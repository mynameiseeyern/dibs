"use client";

import { useOptimistic, useTransition } from "react";
import type { Vibe } from "@dibs/shared/types";

export const VIBE_OPTIONS = [
  { id: "chill", name: "Chill", note: "Easygoing" },
  { id: "extra", name: "Extra", note: "Emoji, hype" },
  { id: "straight", name: "Straight up", note: "No banter" },
] as const;

/**
 * Pick a vibe. Inside a form it's a plain radio group (name="vibe").
 * With `onChange` it switches straight away, for the plan's edit screen.
 */
export function VibePick({ value = "chill", onChange }: { value?: Vibe; onChange?: (v: Vibe) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  return (
    <div className="vibe-pick" role="radiogroup" aria-label="Vibe" aria-busy={pending}>
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
              : { defaultChecked: value === v.id })}
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
