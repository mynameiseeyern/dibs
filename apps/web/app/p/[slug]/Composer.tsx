"use client";

import { useActionState, useRef, useState } from "react";
import { DibbyMark } from "@/components/Logo";
import type { FormState } from "./actions";

export function Composer({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [text, setText] = useState("");
  const [askedDibby, setAskedDibby] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (s: FormState, f: FormData) => {
    const r = await action(s, f);
    setText("");
    return r;
  }, undefined);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="composer"
      onSubmit={() => setAskedDibby(/(^|\s)@dibby\b/i.test(text))}
    >
      {pending && askedDibby && (
        <div className="db-msg db-msg--ai" aria-live="polite">
          <span className="db-avatar db-avatar--sm" aria-hidden="true">
            <DibbyMark size={32} />
          </span>
          <div className="db-msg__bubble typing">
            Dibby&rsquo;s on it<span className="dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
        </div>
      )}
      <div className="composer__row">
        <div className="db-input">
          <label htmlFor="body" className="sr-only">
            Message
          </label>
          <input
            id="body"
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message, or @dibby…"
            autoComplete="off"
            maxLength={2000}
          />
        </div>
        <button className="db-btn db-btn--primary db-btn--icon" aria-label="Send" disabled={pending || !text.trim()}>
          <i className="ri-send-plane-2-fill db-icon" aria-hidden="true" />
        </button>
      </div>
      {!text && (
        <button type="button" className="db-btn db-btn--ghost db-btn--sm composer__chip" onClick={() => setText("@dibby ")}>
          <i className="ri-sparkling-line db-icon" aria-hidden="true" /> Ask Dibby
        </button>
      )}
      {state?.error && (
        <p className="db-hint db-hint--error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
