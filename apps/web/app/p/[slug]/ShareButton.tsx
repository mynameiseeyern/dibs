"use client";

import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/** Opens the share sheet (WhatsApp on most phones); falls back to a WhatsApp link, then copy. */
export function ShareButton({
  text,
  url,
  title,
  label = "Share to the group chat",
  quiet = false,
}: {
  text: string;
  url: string;
  title: string;
  label?: string;
  /** Secondary style, for share moments that aren't the screen's main action. */
  quiet?: boolean;
}) {
  async function share() {
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
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { description: "Paste it in the group chat." });
  }

  return (
    <Button.Root
      type="button"
      variant={quiet ? "neutral" : "dibs"}
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
