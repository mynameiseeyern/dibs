"use client";

import { useState } from "react";
import { Monogram } from "@/components/Monogram";
import * as Button from "@/components/ui/button";
import * as Checkbox from "@/components/ui/checkbox";
import * as Input from "@/components/ui/input";
import * as Hint from "@/components/ui/hint";

const MAX = 20;
const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 40);

/**
 * Someone came who wasn't on the plan. Names added here ride along with the wrap-up form
 * (as `walkin`) and only become members when the organiser saves it.
 */
export function WalkIns({ taken }: { taken: string[] }) {
  const [names, setNames] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();

  const add = () => {
    const name = clean(draft);
    if (!name) return setError("Pop in their name.");
    const lower = [...taken, ...names].map((n) => n.toLowerCase());
    if (lower.includes(name.toLowerCase())) return setError(`${name}'s already on the list. Tick them above.`);
    setNames([...names, name]);
    setDraft("");
    setError(undefined);
    setAdding(false);
  };

  return (
    <>
      {names.map((name) => (
        <label key={name} className="tick">
          <Monogram name={name} colour="ivory" />
          <span className="label-md person__name">
            {name}
            <small>Came last minute · added by you</small>
          </span>
          <Checkbox.Root
            name="walkin"
            value={name}
            defaultChecked
            aria-label={`${name} came`}
            onCheckedChange={(on) => !on && setNames(names.filter((n) => n !== name))}
          />
        </label>
      ))}
      {adding ? (
        <div className="flex flex-col gap-2 pt-3">
          <div className="flex gap-2">
            <Input.Root className="flex-1">
              <Input.Wrapper>
                <Input.Input
                  autoFocus
                  value={draft}
                  maxLength={40}
                  placeholder="Their name"
                  aria-label="Name of someone who came"
                  autoComplete="off"
                  enterKeyHint="done"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter adds the name; it mustn't submit the whole wrap-up.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add();
                    }
                  }}
                />
              </Input.Wrapper>
            </Input.Root>
            <Button.Root type="button" onClick={add}>
              Add
            </Button.Root>
          </div>
          <Hint.Root hasError={!!error}>{error ?? "They'll be on the bills. No app needed: whoever paid marks them as square."}</Hint.Root>
        </div>
      ) : (
        names.length < MAX && (
          <Button.Root type="button" mode="ghost" className="mt-2 self-start" onClick={() => setAdding(true)}>
            <Button.Icon as="i" className="ri-user-add-line" />
            Someone else came
          </Button.Root>
        )
      )}
    </>
  );
}
