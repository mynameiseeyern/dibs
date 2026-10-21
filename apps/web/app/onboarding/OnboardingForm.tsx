"use client";

import { useActionState } from "react";
import { saveProfile } from "../actions";
import { Field, FormError } from "@/components/Field";

export function OnboardingForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <div className="split2">
        <Field label="First name" name="first_name" autoComplete="given-name" required maxLength={40} />
        <Field label="Last name" name="last_name" autoComplete="family-name" required maxLength={40} />
      </div>
      <Field label="Date of birth" name="dob" type="date" autoComplete="bday" required hint="You need to be 18+ to organise. We don't show this to anyone." />
      <Field
        label="PayID (optional)"
        name="payid"
        icon="ri-bank-line"
        placeholder="Phone, email or ABN"
        hint="Only shown to people who owe you, after they've come along. You can add it later."
      />
      <FormError error={state?.error} />
      <button className="db-btn db-btn--primary db-btn--lg db-btn--block" disabled={pending}>
        {pending ? "Saving…" : "Let's go"}
      </button>
    </form>
  );
}
