"use client";

import { useActionState, useRef, useState } from "react";
import { DibbyMark } from "@/components/Logo";
import type { FormState } from "./actions";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Avatar from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";

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
          <Avatar.Root size="32" className="bg-transparent" aria-hidden="true">
            <DibbyMark size={32} />
          </Avatar.Root>
          <div className="db-msg__bubble typing">
            Dibby&rsquo;s on it<span className="dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
        </div>
      )}
      <div className="composer__row">
        <label htmlFor="body" className="sr-only">
          Message
        </label>
        <Input.Root className="flex-1">
          <Input.Wrapper>
            <Input.Input
              id="body"
              name="body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message, or @dibby…"
              autoComplete="off"
              maxLength={2000}
            />
          </Input.Wrapper>
        </Input.Root>
        <Button.Root iconOnly aria-label="Send" disabled={pending || !text.trim()}>
          <i className="ri-send-plane-2-fill db-icon" aria-hidden="true" />
        </Button.Root>
      </div>
      {!text && (
        <Button.Root type="button" mode="ghost" size="small" className="composer__chip" onClick={() => setText("@dibby ")}>
          <i className="ri-sparkling-line db-icon" aria-hidden="true" /> Ask Dibby
        </Button.Root>
      )}
      {state?.error && (
        <Hint.Root hasError role="alert">
          {state.error}
        </Hint.Root>
      )}
    </form>
  );
}

/**
 * What maybes (and anyone not going yet) see instead of the composer: it looks like one, and
 * tapping it says why they can't post.
 */
export function ReadOnlyComposer({ note }: { note: string }) {
  return (
    <div className="composer">
      <div className="composer__row">
        <button type="button" className="composer__readonly" onClick={() => toast.info(note)} aria-describedby="composer-ro-note">
          <i className="ri-lock-line db-icon" aria-hidden="true" />
          <span>Read only</span>
        </button>
      </div>
      <p id="composer-ro-note" className="paragraph-xs muted">
        {note}
      </p>
    </div>
  );
}
