"use client";

import { useActionState } from "react";
import { createPlan } from "../actions";
import { Field, FormError } from "@/components/Field";
import { VibePick } from "@/components/VibePick";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
import * as Switch from "@/components/ui/switch";

export function NewPlanForm() {
  const [state, action, pending] = useActionState(createPlan, undefined);
  return (
    <form action={action} className="form">
      <Field label="Name it" name="title" placeholder="Friday dinner" required maxLength={80} autoComplete="off" />
      <Field label="Where-ish" name="area" placeholder="Surry Hills" icon="ri-map-pin-line" maxLength={80} autoComplete="off" />
      <Field label="When" name="starts_at" type="datetime-local" hint="Sydney and Melbourne time. Leave it blank to sort it out later." />

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Label.Root asChild className="mb-2">
          <legend>Vibe</legend>
        </Label.Root>
        <VibePick />
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <Switch.Root name="plus_ones" />
        Plus-ones welcome
      </label>

      <FormError error={state?.error} />

      <div className="dock">
        <div className="dock__inner">
          <Button.Root variant="dibs" size="large" block disabled={pending}>
            {pending ? "Making it…" : "Make the plan"}
          </Button.Root>
        </div>
      </div>
    </form>
  );
}
