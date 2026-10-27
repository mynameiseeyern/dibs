"use client";

import { useRef, useState } from "react";
import { CATEGORY_MAX, PLAN_CATEGORIES, categoryIcon, cleanCategory } from "@dibs/shared/plans";
import * as Input from "@/components/ui/input";
import * as Hint from "@/components/ui/hint";
import { Chip } from "./chips";

/**
 * Optional label for the plan. Dibby's broad presets, then the organiser's own (signed in), then
 * "Something else" to type one. Tap a chip again to clear it.
 */
export function CategoryPick({ saved, signedIn, initial = null }: { saved: string[]; signedIn: boolean; initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const own = [...(initial ? [initial] : []), ...saved].filter((s, i, a) => a.indexOf(s) === i && !PLAN_CATEGORIES.some((c) => c.label === s));
  const items = [...PLAN_CATEGORIES.map((c) => c.label), ...own];
  const pick = (label: string) => {
    setTyping(false);
    setValue(value === label ? null : label);
  };
  const posted = typing ? cleanCategory(typed) : value;
  const isNew = typing && posted && !items.some((i) => i.toLowerCase() === posted.toLowerCase());

  return (
    <div className="chip-group">
      <input type="hidden" name="category" value={posted ?? ""} />
      <span className="label-sm" id="category-l">
        What kind of plan? <span className="muted">Optional</span>
      </span>
      <div className="chip-row" role="group" aria-labelledby="category-l">
        {items.map((label) => (
          <Chip key={label} on={!typing && value === label} onClick={() => pick(label)}>
            <i className={`${categoryIcon(label)} db-icon`} aria-hidden="true" />
            {label}
          </Chip>
        ))}
        <Chip
          on={typing}
          onClick={() => {
            setTyping(!typing);
            if (!typing) requestAnimationFrame(() => input.current?.focus());
          }}
        >
          <i className="ri-add-line db-icon" aria-hidden="true" />
          Something else
        </Chip>
      </div>
      {typing && (
        <div className="flex flex-col gap-2">
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as="i" className="ri-price-tag-3-line" aria-hidden="true" />
              <Input.Input
                ref={input}
                aria-label="Your category"
                placeholder="Book club, trivia, hike…"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                maxLength={CATEGORY_MAX}
                autoComplete="off"
              />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root>
            {signedIn
              ? isNew
                ? "Saved to your categories once the plan's made."
                : "Just a label, for you and the crew."
              : "Just for this plan. Add your email below and Dibby keeps the ones you make up."}
          </Hint.Root>
        </div>
      )}
    </div>
  );
}
