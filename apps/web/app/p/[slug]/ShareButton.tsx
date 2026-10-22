"use client";

import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className={quiet ? "db-btn db-btn--secondary db-btn--block" : "db-btn db-btn--dibs db-btn--lg db-btn--block"} onClick={share}>
      <i className="ri-whatsapp-line db-icon" aria-hidden="true" />
      {copied ? "Link copied" : label}
    </button>
  );
}
