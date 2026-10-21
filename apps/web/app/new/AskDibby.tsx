"use client";

import { useActionState } from "react";
import { DibbyMark } from "@/components/Logo";
import { FormError } from "@/components/Field";
import { createWithDibby } from "../actions";

export function AskDibby() {
  const [state, action, pending] = useActionState(createWithDibby, undefined);
  return (
    <form action={action} className="db-card section" aria-labelledby="ask-h">
      <div className="db-row" style={{ alignItems: "center" }}>
        <DibbyMark size={36} />
        <h2 id="ask-h" className="title-h4">Ask Dibby</h2>
      </div>
      <div className="db-input">
        <label htmlFor="ask" className="sr-only">What are you after?</label>
        <input id="ask" name="ask" placeholder="dinner Friday in Surry Hills, cheap-ish" maxLength={500} autoComplete="off" />
      </div>
      {pending ? (
        <p className="small muted typing" aria-live="polite">
          Dibby&rsquo;s on it<span className="dots" aria-hidden="true"><i /><i /><i /></span>
        </p>
      ) : (
        <p className="small muted">Dibby picks three spots and opens a vote. What you type here goes to an AI provider.</p>
      )}
      <FormError error={state?.error} />
      <button className="db-btn db-btn--primary db-btn--block" disabled={pending}>
        <i className="ri-sparkling-line db-icon" aria-hidden="true" />
        {pending ? "Drafting…" : "Draft it"}
      </button>
    </form>
  );
}
