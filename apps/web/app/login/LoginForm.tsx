"use client";

import { AgreeLine } from "@/components/AgreeLine";
import { useActionState } from "react";
import { signIn } from "../actions";
import { Field, FormError } from "@/components/Field";
import * as Button from "@/components/ui/button";
import * as Alert from "@/components/ui/alert";

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  if (state?.sent) {
    return (
      <Alert.Root status="success" role="status">
        <Alert.Icon as="i" className="ri-mail-check-fill" aria-hidden="true" />
        <div>
          <strong>Check your email</strong>
          We sent a sign-in link to {state.sent}. Open it on any device.
        </div>
      </Alert.Root>
    );
  }
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      {!demo && <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required icon="ri-mail-line" />}
      <FormError error={state?.error} />
      <AgreeLine />
      <Button.Root size="large" block disabled={pending}>
        {demo ? "Continue" : pending ? "Sending…" : "Email me a link"}
      </Button.Root>
    </form>
  );
}
