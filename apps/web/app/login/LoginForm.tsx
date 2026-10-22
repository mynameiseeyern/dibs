"use client";

import { useActionState } from "react";
import { signIn } from "../actions";
import { Field, FormError } from "@/components/Field";

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  if (state?.sent) {
    return (
      <div className="db-alert db-alert--success" role="status">
        <i className="ri-mail-check-fill db-icon" aria-hidden="true" />
        <div>
          <strong>Check your email</strong>
          We sent a sign-in link to {state.sent}. Open it on any device.
        </div>
      </div>
    );
  }
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      {!demo && <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required icon="ri-mail-line" />}
      <FormError error={state?.error} />
      <button className="db-btn db-btn--primary db-btn--lg db-btn--block" disabled={pending}>
        {demo ? "Continue" : pending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}
