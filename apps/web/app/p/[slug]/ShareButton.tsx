"use client";

import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { CircleAction } from "@/components/CircleAction";

/** Opens the share sheet (WhatsApp on most phones); falls back to a WhatsApp link, then copy. */
export function ShareButton({
  text,
  url,
  title,
  label = "Share to the group chat",
  quiet = false,
  circle = false,
  tone = "dibs",
  onShare,
}: {
  text: string;
  url: string;
  title: string;
  label?: string;
  /** Secondary style, for share moments that aren't the screen's main action. */
  quiet?: boolean;
  /** A round action in the plan's action row instead of a full-width button (a locked plan). */
  circle?: boolean;
  /** Lime ("dibs") is the one call-dibs moment per screen; violet when lime's already taken (attendees' I'm in). */
  tone?: "dibs" | "primary";
  /** Counts the tap (a server action). Fire and forget: sharing never waits on it. */
  onShare?: () => Promise<void>;
}) {
  async function share() {
    onShare?.().catch(() => {});
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: "Paste it in the group chat." });
    } catch {
      // Clipboard blocked (some browsers, in-app webviews): show the link to copy by hand.
      toast.info("Copy this link to the group chat", { description: url, duration: 10000 });
    }
  }

  if (circle) return <CircleAction icon="ri-whatsapp-line" label={label} onClick={share} tone={tone === "dibs" ? "dibs" : undefined} />;

  return (
    <Button.Root
      type="button"
      variant={quiet ? "neutral" : tone}
      mode={quiet ? "lighter" : "filled"}
      size={quiet ? "medium" : "large"}
      block
      onClick={share}
    >
      <i className="ri-whatsapp-line db-icon" aria-hidden="true" />
      {label}
    </Button.Root>
  );
}
