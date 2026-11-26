"use client";

import { useActionState } from "react";
import { saveProfile } from "../actions";
import { Field, FormError } from "@/components/Field";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as Checkbox from "@/components/ui/checkbox";
import { AgreeLine } from "@/components/AgreeLine";

export function OnboardingForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <div className="split2">
        <Field label="First name" name="first_name" autoComplete="given-name" required maxLength={40} />
        <Field label="Last name" name="last_name" autoComplete="family-name" required maxLength={40} />
      </div>
      <Field
        label="PayID (optional)"
        name="payid"
        icon="ri-bank-line"
        placeholder="Phone, email or ABN"
        hint="Only shown to people who owe you, after they've come along. You can add it later."
      />
      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <Checkbox.Root name="beta_updates" aria-describedby="beta_updates-hint" />
          Send me Dibby beta updates
        </label>
        <Hint.Root id="beta_updates-hint">
          A short email when we ship something new. Unsubscribe any time.
        </Hint.Root>
      </div>
      <FormError error={state?.error} />
      <AgreeLine />
      <Button.Root size="large" block disabled={pending}>
        {pending ? "Saving…" : "Let's go"}
      </Button.Root>
    </form>
  );
}
