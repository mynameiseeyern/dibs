"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Button from "@/components/ui/button";
import * as LinkButton from "@/components/ui/link-button";
import { toast } from "@/components/ui/toast";

/**
 * Under Dibby's reply, for whoever asked: a new plan Dibby drafted, made only once they say so
 * (ARV-59). Nobody's invited until then.
 */
export function ConfirmPlanCard({
  title,
  facts,
  answer,
}: {
  title: string;
  /** "Fri 28 Nov, 7:00 pm · Newtown · 3 places to vote on" */
  facts: string;
  answer: (make: boolean) => Promise<{ error?: string; slug?: string }>;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (make: boolean) =>
    start(async () => {
      const r = await answer(make);
      if (r.error) return void toast.error(r.error);
      if (r.slug) {
        toast.success("It's set up", { description: "Everyone from here is invited." });
        router.push(`/p/${r.slug}`);
      }
    });
  return (
    <div className="dibby-card" role="group" aria-label={`New plan: ${title}`}>
      <p className="label-sm">New plan: {title}</p>
      {facts && <p className="paragraph-xs muted">{facts}</p>}
      <p className="paragraph-xs muted">Everyone here gets invited once you set it up.</p>
      <div className="dibby-card__actions">
        <Button.Root type="button" size="medium" className="min-h-11" disabled={pending} onClick={() => go(true)}>
          Set it up
        </Button.Root>
        <Button.Root type="button" variant="neutral" mode="stroke" size="medium" className="min-h-11" disabled={pending} onClick={() => go(false)}>
          Not now
        </Button.Root>
      </div>
    </div>
  );
}

/** Takes the places Dibby added in this reply back off the vote. For the asker and hosts. */
export function UndoPlaces({ count, undo }: { count: number; undo: () => Promise<{ error?: string; removed?: number }> }) {
  const [pending, start] = useTransition();
  return (
    <LinkButton.Root
      type="button"
      variant="gray"
      className="min-h-11 self-start"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await undo();
          if (r.error) toast.error(r.error);
          else toast.success(r.removed ? "Taken off the vote" : "Already off the vote");
        })
      }
    >
      <i className="ri-arrow-go-back-line db-icon" aria-hidden="true" /> Undo {count === 1 ? "this place" : "these places"}
    </LinkButton.Root>
  );
}
