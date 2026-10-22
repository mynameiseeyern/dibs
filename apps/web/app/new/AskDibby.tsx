"use client";

import { useActionState } from "react";
import { DibbyMark } from "@/components/Logo";
import { FormError } from "@/components/Field";
import { createWithDibby } from "../actions";
import { VibePick } from "@/components/VibePick";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";

export function AskDibby() {
  const [state, action, pending] = useActionState(createWithDibby, undefined);
  return (
    <form action={action} className="db-card section" aria-labelledby="ask-h">
      <div className="db-row">
        <DibbyMark size={36} />
        <h2 id="ask-h" className="title-h4">Ask Dibby</h2>
      </div>
      <label htmlFor="ask" className="sr-only">What are you after?</label>
      <Input.Root>
        <Input.Wrapper>
          <Input.Input id="ask" name="ask" placeholder="dinner Friday in Surry Hills, cheap-ish" maxLength={500} autoComplete="off" />
        </Input.Wrapper>
      </Input.Root>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Label.Root asChild className="mb-2">
          <legend>Vibe</legend>
        </Label.Root>
        <VibePick />
      </fieldset>
      {pending ? (
        <p className="paragraph-sm muted typing" aria-live="polite">
          Dibby&rsquo;s on it<span className="dots" aria-hidden="true"><i /><i /><i /></span>
        </p>
      ) : (
        <p className="paragraph-sm muted">Dibby picks three spots and opens a vote. What you type here goes to an AI provider.</p>
      )}
      <FormError error={state?.error} />
      <Button.Root block disabled={pending}>
        <i className="ri-sparkling-line db-icon" aria-hidden="true" />
        {pending ? "Drafting…" : "Draft it"}
      </Button.Root>
    </form>
  );
}
