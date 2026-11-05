"use client";

import { useOptimistic, useTransition } from "react";
import { RSVP_LABEL } from "@dibs/shared/plans";
import type { Rsvp, Vibe } from "@dibs/shared/types";
import { rsvpHeading } from "@/lib/copy";
import * as Button from "@/components/ui/button";
import { send } from "@/lib/send";
import { play } from "@/lib/feedback";
import { PlusOne } from "./PlusOne";

/**
 * RSVP buttons that answer the tap straight away. The choice shows immediately
 * and the server action saves it in the background; when the page revalidates,
 * the server's answer (including a waitlist spot) replaces the optimistic one.
 */
export function RsvpPicker({
  rsvp,
  waitlisted,
  waitlistPlace = null,
  plusOne,
  plusOneName = null,
  plusOnes,
  setRsvp,
  setPlusOne,
  vibe = "chill",
}: {
  vibe?: Vibe;
  rsvp: Rsvp | null;
  waitlisted: boolean;
  /** Where you are in line on the waitlist (1 = next in). */
  waitlistPlace?: number | null;
  plusOne: boolean;
  plusOneName?: string | null;
  plusOnes: boolean;
  setRsvp: (rsvp: Rsvp) => Promise<void>;
  setPlusOne?: (on: boolean, name: string) => Promise<{ error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(rsvp);
  // A fresh tap means we don't know the waitlist outcome yet.
  const showWaitlist = waitlisted && shown === rsvp;

  function choose(r: Rsvp) {
    if (pending && shown === r) return;
    // "I'm in" gets the pop (the moment that follows won't play it twice); the rest a tap.
    if (shown !== r) play(r === "in" ? "pop" : "tap");
    startTransition(async () => {
      setShown(r);
      await send(() => setRsvp(r), { what: "your answer" });
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
      {showWaitlist && (
        <p className="paragraph-sm muted">
          It&rsquo;s full, so you&rsquo;re {waitlistPlace ? `number ${waitlistPlace} ` : ""}in line. If someone drops out, you&rsquo;re in straight away and the chat hears about it.
        </p>
      )}
      {shown === "in" && rsvp === "in" && !waitlisted && setPlusOne && <PlusOne on={plusOne} name={plusOneName} allowed={plusOnes} save={setPlusOne} />}
    </>
  );
}
