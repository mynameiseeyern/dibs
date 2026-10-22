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
      <div className="db-field">
        <label className="db-check">
          <input type="checkbox" name="beta_updates" aria-describedby="beta_updates-hint" />
          Send me dibs beta updates
        </label>
        <p id="beta_updates-hint" className="db-hint">
          A short email when we ship something new. Unsubscribe any time.
        </p>
      </div>
      <FormError error={state?.error} />
      <button className="db-btn db-btn--primary db-btn--lg db-btn--block" disabled={pending}>
        {pending ? "Saving…" : "Let's go"}
      </button>
    </form>
  );
}
