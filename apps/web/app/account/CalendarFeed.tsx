"use client";

import { useState, useTransition } from "react";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

/**
 * One private link that keeps your plans in your calendar. Subscribing opens the calendar app
 * (webcal:// on iPhone and Mac, Google's "add by URL" page, or copy it for anything else).
 */
export function CalendarFeed({ url, reset }: { url: string; reset: () => Promise<{ error?: string }> }) {
  const webcal = url.replace(/^https?:\/\//, "webcal://");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const [confirming, setConfirming] = useState(false);
  const [busy, start] = useTransition();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy it. Press and hold the link instead.");
    }
  };

  return (
    <div className="db-stack">
      <p className="paragraph-sm muted">
        Plans you&rsquo;re in show up in your calendar once they&rsquo;re locked in, and change when the plan does. Called off or can&rsquo;t go? It drops off.
      </p>
      <Button.Root asChild variant="primary" size="large" block>
        <a href={webcal}>
          <i className="ri-calendar-check-line db-icon" aria-hidden="true" />
          Subscribe in Calendar
        </a>
      </Button.Root>
      <Button.Root asChild variant="neutral" mode="lighter" block>
        <a href={google} target="_blank" rel="noopener noreferrer">
          <i className="ri-google-line db-icon" aria-hidden="true" />
          Add to Google Calendar
        </a>
      </Button.Root>
      <Button.Root type="button" variant="neutral" mode="ghost" block onClick={copy}>
        <i className="ri-file-copy-line db-icon" aria-hidden="true" />
        Copy link for another calendar
      </Button.Root>
      <p className="paragraph-xs muted">
        Calendars check for changes about once an hour, Google less often. Want it quicker on an iPhone or Mac? Set your calendar to refresh every 15 minutes. Keep the link to yourself: anyone with it can see your plans.{" "}
        <button type="button" className="underline" onClick={() => setConfirming(true)}>
          Reset link
        </button>
      </p>

      <Modal.Root open={confirming} onOpenChange={(o) => !busy && setConfirming(o)}>
        <Modal.Content>
          <Modal.Header title="Reset your calendar link?" />
          <Modal.Body>The old link stops working, so any calendar using it stops updating. Subscribe again with the new one.</Modal.Body>
          <Modal.Footer>
            <Button.Root
              variant="error"
              mode="lighter"
              size="large"
              block
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const r = await reset();
                  setConfirming(false);
                  if (r.error) toast.error(r.error);
                  else toast.success("New link ready. Subscribe again with it.");
                })
              }
            >
              {busy ? "Resetting…" : "Reset link"}
            </Button.Root>
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="lighter" size="large" block disabled={busy}>
                Keep it
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
