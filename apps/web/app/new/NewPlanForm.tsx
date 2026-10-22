"use client";

import { useActionState } from "react";
import { createPlan } from "../actions";
import { Field, FormError } from "@/components/Field";
import { VibePick } from "@/components/VibePick";


export function NewPlanForm() {
  const [state, action, pending] = useActionState(createPlan, undefined);
  return (
    <form action={action} className="form">
      <Field label="Name it" name="title" placeholder="Friday dinner" required maxLength={80} autoComplete="off" />
      <Field label="Where-ish" name="area" placeholder="Surry Hills" icon="ri-map-pin-line" maxLength={80} autoComplete="off" />
      <Field label="When" name="starts_at" type="datetime-local" hint="Sydney and Melbourne time. Leave it blank to sort it out later." />

      <fieldset className="db-field">
        <legend className="db-label">
          Vibe
        </legend>
        <VibePick />
      </fieldset>

      <label className="db-switch">
        <input type="checkbox" name="plus_ones" role="switch" />
        Plus-ones welcome
      </label>

      <FormError error={state?.error} />

      <div className="dock">
        <div className="dock__inner">
          <button className="db-btn db-btn--dibs db-btn--lg db-btn--block" disabled={pending}>
            {pending ? "Making it…" : "Make the plan"}
          </button>
        </div>
      </div>
    </form>
  );
}
