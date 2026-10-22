"use client";

import { useActionState, useState } from "react";
import { Field, FormError } from "@/components/Field";
import type { FormState } from "./actions";
import * as Button from "@/components/ui/button";

export function ManageForm({
  action,
  cancel,
  initial,
  placeLabel,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  cancel: () => Promise<void>;
  initial: { title: string; startsAt: string; place: string };
  /** The vote's area field. Null once there's a set place (that's changed on the map). */
  placeLabel: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <form action={formAction} className="form">
        <Field label="Name" name="title" defaultValue={initial.title} maxLength={80} required autoComplete="off" />
        <Field label="When" name="starts_at" type="datetime-local" defaultValue={initial.startsAt} hint="Sydney and Melbourne time." />
        {placeLabel && <Field label={placeLabel} name="place" defaultValue={initial.place} icon="ri-map-pin-line" maxLength={80} autoComplete="off" />}
        <FormError error={state?.error} />
        <Button.Root size="large" block disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button.Root>
        <p className="paragraph-sm muted">Everyone sees an &ldquo;Updated&rdquo; note on the plan. Share it to the group chat again so the card refreshes.</p>
      </form>

      <section className="db-card section" aria-labelledby="cancel-h">
        <h2 id="cancel-h" className="title-h4">Call it off</h2>
        {!confirming ? (
          <>
            <p className="muted">The page stays up and says it&rsquo;s off, so nobody turns up to an empty table.</p>
            <Button.Root type="button" variant="error" mode="lighter" block onClick={() => setConfirming(true)}>
              <i className="ri-close-line db-icon" aria-hidden="true" />
              Call it off
            </Button.Root>
          </>
        ) : (
          <form action={cancel} className="db-stack">
            <p className="muted" role="status">Sure? This can&rsquo;t be undone. You can always make a new plan.</p>
            <Button.Root variant="error" mode="lighter" block>Yep, call it off</Button.Root>
            <Button.Root type="button" variant="neutral" mode="lighter" block onClick={() => setConfirming(false)}>
              Keep the plan
            </Button.Root>
          </form>
        )}
      </section>
    </>
  );
}
