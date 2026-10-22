"use client";

import { useOptimistic, useTransition } from "react";
import { RSVP_LABEL } from "@dibs/shared/plans";
import type { Rsvp, Vibe } from "@dibs/shared/types";
import { rsvpHeading } from "@/lib/copy";
import * as Button from "@/components/ui/button";

/**
 * RSVP buttons that answer the tap straight away. The choice shows immediately
 * and the server action saves it in the background; when the page revalidates,
 * the server's answer (including a waitlist spot) replaces the optimistic one.
 */
export function RsvpPicker({
  rsvp,
  waitlisted,
  plusOne,
  plusOnes,
  setRsvp,
  vibe = "chill",
}: {
  vibe?: Vibe;
  rsvp: Rsvp | null;
  waitlisted: boolean;
  plusOne: boolean;
  plusOnes: boolean;
  setRsvp: (rsvp: Rsvp, form: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(rsvp);
  // A fresh tap means we don't know the waitlist outcome yet.
  const showWaitlist = waitlisted && shown === rsvp;

  function choose(r: Rsvp) {
    if (pending && shown === r) return;
    const form = new FormData();
    if (r === "in" && plusOnes) form.set("plus_one", plusOne ? "on" : "");
    startTransition(async () => {
      setShown(r);
      await setRsvp(r, form);
    });
  }

  const heading = rsvpHeading(vibe, showWaitlist ? "waitlist" : shown ?? "none");

  return (
    <>
      <h2 id="rsvp-h" className="label-md">
        {heading}
      </h2>
      <div className="rsvp" role="group" aria-label="Are you in?" aria-busy={pending}>
        {(["in", "maybe", "out"] as const).map((r) => (
          <Button.Root
            key={r}
            type="button"
            variant={shown !== r ? "neutral" : r === "in" ? "dibs" : "primary"}
            mode={shown === r ? "filled" : "lighter"}
            className="px-2"
            aria-pressed={shown === r}
            onClick={() => choose(r)}
          >
            {RSVP_LABEL[r]}
          </Button.Root>
        ))}
      </div>
      {showWaitlist && <p className="paragraph-sm muted">It's full. The host will let you know if a spot opens up.</p>}
    </>
  );
}
