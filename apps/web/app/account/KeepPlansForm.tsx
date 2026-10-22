"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/Field";
import { keepMyPlans } from "../actions";
import * as Button from "@/components/ui/button";
import * as Alert from "@/components/ui/alert";

export function KeepPlansForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState(keepMyPlans, undefined);
  if (state?.sent) {
    return (
      <Alert.Root status="success" role="status">
        <Alert.Icon as="i" className="ri-mail-check-fill" aria-hidden="true" />
        <div>
          <strong>Check your email</strong>
          Tap the link we sent to {state.sent}, on any device. Your plans will be waiting.
        </div>
      </Alert.Root>
    );
  }
  return (
    <form action={action} className="form">
      {!demo && <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required icon="ri-mail-line" />}
      {demo && <input type="hidden" name="email" value="demo@dibby.social" />}
      <FormError error={state?.error} />
      <Button.Root block disabled={pending}>
        {pending ? "Sending…" : "Email me a link"}
      </Button.Root>
      <p className="paragraph-xs muted">We only use it to sign you in. No spam, no newsletters.</p>
    </form>
  );
}
