"use client";

import { useState, useTransition } from "react";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

type To = "cohost" | "guest" | "organiser";

/**
 * The organiser's menu on someone in the who's going list: make them a co-host, or hand the
 * whole plan over. Handing over is confirmed first, since you can't take it back yourself.
 */
export function HostMenu({
  name,
  role,
  canRun,
  why,
  setHost,
  rejoin,
  canManage = true,
}: {
  name: string;
  role: "cohost" | "guest";
  /** Going and has the app. */
  canRun: boolean;
  /** Why they can't run it, when they can't. */
  why: string | null;
  setHost: (to: To) => Promise<{ error?: string; name?: string }>;
  /** For people without an account: a link that puts them back on this plan. */
  rejoin?: () => Promise<{ url?: string; error?: string }>;
  /** The organiser: co-host and hand-over options. Co-hosts only get the link. */
  canManage?: boolean;
}) {
  const first = name.split(" ")[0];
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const run = (to: To, done: string) =>
    start(async () => {
      const res = await setHost(to);
      setOpen(false);
      setConfirming(false);
      if (res.error) toast.error(res.error);
      else toast.success(done);
    });

  return (
    <>
      <Button.Root type="button" mode="ghost" variant="neutral" iconOnly className="person__menu" aria-label={`Options for ${name}`} onClick={() => setOpen(true)}>
        <i className="ri-more-2-fill db-icon" aria-hidden="true" />
      </Button.Root>
      <Modal.Root open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <Modal.Content>
          <Modal.Header title={confirming ? `Hand the plan over to ${first}?` : name} />
          <Modal.Body>
            {confirming ? (
              <p>
                {first} becomes the organiser: they run the vote, wrap-up and bills, and can hand it back. You stay on as a co-host.
              </p>
            ) : !canManage ? (
              <p>{`${first} joined without the app. If their browser forgot them, send them their link and they're back on this plan.`}</p>
            ) : canRun ? (
              <p>{role === "cohost" ? `${first} helps run this plan.` : `Get ${first} to help run this plan, or hand it over completely.`}</p>
            ) : (
              <p>{why}</p>
            )}
            {rejoin && canManage && !confirming && <p className="paragraph-sm muted">Browser forgot them? Send them their link and they&rsquo;re back on this plan.</p>}
          </Modal.Body>
          <Modal.Footer>
            {confirming ? (
              <>
                <Button.Root size="large" block disabled={pending} onClick={() => run("organiser", `${first}'s running it now`)}>
                  {pending ? "Handing over…" : `Hand it to ${first}`}
                </Button.Root>
                <Button.Root variant="neutral" mode="lighter" size="large" block disabled={pending} onClick={() => setConfirming(false)}>
                  Back
                </Button.Root>
              </>
            ) : (
              <>
                {!canManage ? null : role === "cohost" ? (
                  <Button.Root variant="neutral" mode="lighter" size="large" block disabled={pending} onClick={() => run("guest", `${first}'s not a co-host any more`)}>
                    <i className="ri-user-unfollow-line db-icon" aria-hidden="true" />
                    Remove as co-host
                  </Button.Root>
                ) : (
                  canRun && (
                    <Button.Root variant="neutral" mode="lighter" size="large" block disabled={pending} onClick={() => run("cohost", `${first}'s a co-host now`)}>
                      <i className="ri-user-star-line db-icon" aria-hidden="true" />
                      Make co-host
                    </Button.Root>
                  )
                )}
                {canManage && canRun && (
                  <Button.Root variant="neutral" mode="lighter" size="large" block disabled={pending} onClick={() => setConfirming(true)}>
                    <i className="ri-vip-crown-line db-icon" aria-hidden="true" />
                    Hand the plan over
                  </Button.Root>
                )}
                {rejoin && (
                  <Button.Root
                    variant="neutral"
                    mode="lighter"
                    size="large"
                    block
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await rejoin();
                        if (!res.url) return void toast.error(res.error ?? "Couldn't make the link.");
                        const text = `${first}, here's your Dibby link to get back on the plan. It's just for you: ${res.url}`;
                        try {
                          if (navigator.share) await navigator.share({ text });
                          else {
                            await navigator.clipboard.writeText(res.url);
                            toast.success("Link copied", { description: `Send it to ${first} directly, not the group.` });
                          }
                        } catch (e) {
                          if ((e as Error).name !== "AbortError") toast.info(`Send this to ${first}`, { description: res.url, duration: 12000 });
                        }
                      })
                    }
                  >
                    <i className="ri-link db-icon" aria-hidden="true" />
                    Send {first} their link
                  </Button.Root>
                )}
                <Modal.Close asChild>
                  <Button.Root mode="ghost" variant="neutral" size="large" block>
                    Close
                  </Button.Root>
                </Modal.Close>
              </>
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
