"use client";

import { useActionState } from "react";
import { resubscribeWithToken, unsubscribeWithToken, type ListState } from "../email-actions";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";

export function UnsubscribeForm({ token, email, subscribed }: { token: string; email: string; subscribed: boolean }) {
  const [left, leave, leaving] = useActionState<ListState, FormData>(unsubscribeWithToken, undefined);
  const [back, rejoin, rejoining] = useActionState<ListState, FormData>(resubscribeWithToken, undefined);
  const isOff = back?.subscribed ? false : Boolean(left && !left.error) || !subscribed;

  if (isOff) {
    return (
      <section className="db-card section" aria-live="polite">
        <h1 className="title-h4">You&rsquo;re off the list</h1>
        <p className="muted">
          We won&rsquo;t send beta updates to {email} anymore. You&rsquo;ll still get sign-in links when you ask for one.
        </p>
        <form action={rejoin}>
          <input type="hidden" name="t" value={token} />
          <Button.Root mode="ghost" block disabled={rejoining}>
            {rejoining ? "Saving…" : "Changed your mind? Keep getting them"}
          </Button.Root>
        </form>
        {back?.error && <Hint.Root hasError role="alert">{back.error}</Hint.Root>}
      </section>
    );
  }

  return (
    <section className="db-card section" aria-live="polite">
      <h1 className="title-h4">{back?.subscribed ? "You're back on the list" : "Stop beta updates?"}</h1>
      <p className="muted">
        {back?.subscribed
          ? `We'll send the next one to ${email}.`
          : `We'll stop sending release notes to ${email}. Nothing else about your account changes.`}
      </p>
      {!back?.subscribed && (
        <form action={leave}>
          <input type="hidden" name="t" value={token} />
          <Button.Root size="large" block disabled={leaving}>
            {leaving ? "Saving…" : "Unsubscribe"}
          </Button.Root>
        </form>
      )}
      {left?.error && <Hint.Root hasError role="alert">{left.error}</Hint.Root>}
    </section>
  );
}
