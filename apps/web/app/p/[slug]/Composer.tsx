"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { locate, type Coords } from "@/lib/locate";
import { Dibby } from "@/components/Dibby";
import type { FormState } from "./actions";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { play } from "@/lib/feedback";

export function Composer({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [text, setText] = useState("");
  const [askedDibby, setAskedDibby] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Dibby searches around you by default. Location is used silently if it's already allowed;
  // otherwise it's asked for when you send a message to Dibby, not while you're typing one.
  const tagging = /(^|\s)@dibby\b/i.test(text);
  const [near, setNear] = useState<Coords | null>(null);
  const asked = useRef(false);
  useEffect(() => {
    locate({ ask: false }).then((c) => c && setNear(c));
  }, []);
  const [state, formAction, pending] = useActionState(async (s: FormState, f: FormData) => {
    if (/(^|\s)@dibby\b/i.test(String(f.get("body") ?? "")) && !f.get("near_lat") && !asked.current) {
      asked.current = true;
      const c = await locate({ ask: true });
      if (c) {
        setNear(c);
        f.set("near_lat", String(c.lat));
        f.set("near_lng", String(c.lng));
      }
    }
    const r = await action(s, f);
    if (!r?.error) play("send");
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
          <Dibby mood="thinking" size="xs" className="composer__thinking" />
          <div className="db-msg__bubble typing">
            Dibby&rsquo;s on it<span className="dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
        </div>
      )}
      <input type="hidden" name="near_lat" value={tagging && near ? near.lat : ""} />
      <input type="hidden" name="near_lng" value={tagging && near ? near.lng : ""} />
      {/* Above the input, where a thumb finds it, and it stays put while you type. */}
      {!tagging && (
        <Button.Root
          type="button"
          variant="primary"
          mode="lighter"
          size="small"
          className="composer__chip"
          onClick={() => {
            setText((t) => `@dibby ${t}`);
            document.getElementById("body")?.focus();
          }}
        >
          <i className="ri-sparkling-line db-icon" aria-hidden="true" /> Ask Dibby
        </Button.Root>
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
      {tagging && (
        <p className="paragraph-xs muted composer__where">
          <i className={`${near ? "ri-map-pin-fill" : "ri-map-pin-line"} db-icon`} aria-hidden="true" />{" "}
          {near ? "Dibby looks near you. Name a place to look somewhere else." : "Name a place, like “in Newtown”, and Dibby looks there."}
        </p>
      )}
      {tagging && <p className="paragraph-xs muted composer__where">Tagging @dibby sends this and the last 20 messages here to Anthropic, the AI company behind Dibby, so it can reply.</p>}
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
