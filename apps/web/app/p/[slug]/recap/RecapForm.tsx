"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/Field";
import type { FormState } from "./actions";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Avatar from "@/components/ui/avatar";
import type { MonogramColour } from "@dibs/shared/types";

type Person = { id: string; first: string; initials: string; colour: MonogramColour };

export function RecapForm({
  action,
  people,
  initial,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  people: Person[];
  initial: { stars: number | null; best: string | null; mvp: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [stars, setStars] = useState(initial.stars ?? 0);

  return (
    <form action={formAction} className="db-card section">
      <h2 className="title-h4">How was it?</h2>

      <fieldset className="stars" aria-label="Rate the night out of 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="stars__star">
            <input type="radio" name="stars" value={n} checked={stars === n} onChange={() => setStars(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} />
            <i className={n <= stars ? "ri-star-fill" : "ri-star-line"} aria-hidden="true" />
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label.Root htmlFor="best_moment">Best moment</Label.Root>
        <Input.Root>
          <Input.Wrapper>
            <Input.Input id="best_moment" name="best_moment" defaultValue={initial.best ?? ""} maxLength={280} placeholder="The wheel picking Tom on his birthday week" autoComplete="off" />
          </Input.Wrapper>
        </Input.Root>
      </div>

      {people.length > 0 && (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <Label.Root asChild className="mb-2">
            <legend>MVP</legend>
          </Label.Root>
          <div className="mvp">
            {people.map((p) => (
              <label key={p.id} className="mvp__pick">
                <input type="radio" name="mvp" value={p.id} defaultChecked={initial.mvp === p.id} />
                <span>
                  <Avatar.Root color={p.colour} aria-hidden="true">{p.initials}</Avatar.Root>
                  {p.first}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <FormError error={state?.error} />
      {state?.saved && (
        <Hint.Root role="status"><Hint.Icon as="i" className="ri-check-line" aria-hidden="true" /> Saved to the diary.</Hint.Root>
      )}
      <Button.Root size="large" block disabled={pending}>
        {pending ? "Saving…" : initial.stars || initial.best || initial.mvp ? "Update my answers" : "Save to the diary"}
      </Button.Root>
    </form>
  );
}
