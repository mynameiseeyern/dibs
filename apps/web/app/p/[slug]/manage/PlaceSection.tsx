"use client";

import { useState, useTransition } from "react";
import { PlacePicker } from "@/components/PlacePicker";
import { PlaceCard } from "@/components/PlaceCard";
import * as SegmentedControl from "@/components/ui/segmented-control";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

/**
 * Vote or a set place. Hosts switch either way: picking a place on the map locks the plan to
 * it; going back to a vote reopens it for 24 hours with the current place on the list.
 */
export function PlaceSection({
  status,
  venue,
  area,
  optionCount,
  setPlace,
  openVote,
  bare = false,
}: {
  /** Inside a sheet: no card and no heading of its own. */
  bare?: boolean;
  status: "voting" | "locked";
  venue: string | null;
  area: string | null;
  optionCount: number;
  setPlace: (placeId: string) => Promise<{ error?: string }>;
  openVote: () => Promise<{ error?: string }>;
}) {
  const [picking, setPicking] = useState(false);
  const [confirmVote, setConfirmVote] = useState(false);
  const [pending, start] = useTransition();
  const mode = status === "locked" ? "place" : "vote";

  const run = (fn: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(done);
    });

  return (
    <section className={bare ? "db-stack" : "db-card section"} aria-labelledby={bare ? undefined : "place-h"} aria-label={bare ? "The place" : undefined}>
      {!bare && <h2 id="place-h" className="title-h4">The place</h2>}
      <SegmentedControl.Root
        value={mode}
        onValueChange={(v) => {
          if (v === mode || pending) return;
          if (v === "place") setPicking(true);
          else setConfirmVote(true);
        }}
      >
        <SegmentedControl.List aria-label="Vote or a set place">
          <SegmentedControl.Trigger value="place">Already decided</SegmentedControl.Trigger>
          <SegmentedControl.Trigger value="vote">Feeling democratic?</SegmentedControl.Trigger>
        </SegmentedControl.List>
      </SegmentedControl.Root>

      {mode === "place" ? (
        venue ? (
          <PlaceCard name={venue} onChange={pending ? undefined : () => setPicking(true)} />
        ) : (
          <Button.Root type="button" variant="neutral" mode="lighter" block onClick={() => setPicking(true)}>
            <i className="ri-map-2-line db-icon" aria-hidden="true" />
            Pick it on the map
          </Button.Root>
        )
      ) : (
        <p className="paragraph-sm muted">
          {optionCount ? `${optionCount} ${optionCount === 1 ? "place" : "places"} on the vote.` : "No places on the vote yet."} Already know where? Pick
          &ldquo;Already decided&rdquo; and the vote ends.
        </p>
      )}

      <PlacePicker
        open={picking}
        onOpenChange={setPicking}
        title={mode === "place" ? "Change the place" : "Where's it at?"}
        cta="Use"
        area={area}
        onPick={(p) => run(() => setPlace(p.placeId), mode === "vote" ? `Locked in: ${p.name}` : `Now at ${p.name}`)}
      />

      <Modal.Root open={confirmVote} onOpenChange={setConfirmVote}>
        <Modal.Content>
          <Modal.Header title="Put it to a vote?" />
          <Modal.Body>
            {venue ? `${venue} goes on the list so it's still in the running.` : "The plan opens back up for votes."} Voting closes in 24 hours, or when you
            lock it in.
          </Modal.Body>
          <Modal.Footer>
            <Button.Root
              size="large"
              block
              onClick={() => {
                setConfirmVote(false);
                run(openVote, "Back to a vote");
              }}
            >
              Open the vote
            </Button.Root>
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="lighter" size="large" block>
                Keep the place
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </section>
  );
}
