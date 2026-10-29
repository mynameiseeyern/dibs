"use client";

import { useActionState } from "react";
import * as Button from "@/components/ui/button";
import { joinAppWaitlist, type ListState } from "../email-actions";

/**
 * "Tell me when it's out". Signed in with an email: one tap joins the opt-in beta list, which is
 * where the launch email goes. Otherwise: add your email first (sign-in brings you back here).
 */
export function AppWaitlist({ signedIn }: { signedIn: boolean }) {
  const [state, action, pending] = useActionState<ListState>(joinAppWaitlist, undefined);
  if (!signedIn) {
    return (
      <Button.Root asChild variant="dibs" size="large" block>
        <a href="/login?next=/app">
          <i className="ri-mail-line db-icon" aria-hidden="true" />
          Add your email to hear first
        </a>
      </Button.Root>
    );
  }
  if (state?.subscribed) {
    return (
      <p className="paragraph-md" role="status">
        <strong>You&rsquo;re on the list.</strong> We&rsquo;ll email you the day it lands. Your plans will be waiting.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <Button.Root variant="dibs" size="large" block disabled={pending}>
        <i className="ri-notification-3-line db-icon" aria-hidden="true" />
        {pending ? "Adding you…" : "Tell me when it’s out"}
      </Button.Root>
      {state?.error && (
        <p className="paragraph-sm" role="alert">
          {state.error}
        </p>
      )}
      <p className="paragraph-xs muted">One email when it launches, plus the odd beta update. Unsubscribe any time.</p>
    </form>
  );
}
