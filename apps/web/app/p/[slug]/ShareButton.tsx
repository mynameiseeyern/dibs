"use client";

import { useState } from "react";

/** Opens the share sheet (WhatsApp on most phones); falls back to a WhatsApp link, then copy. */
export function ShareButton({ text, url, title }: { text: string; url: string; title: string }) {
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
    <button type="button" className="db-btn db-btn--dibs db-btn--lg db-btn--block" onClick={share}>
      <i className="ri-whatsapp-line db-icon" aria-hidden="true" />
      {copied ? "Link copied" : "Share to the group chat"}
    </button>
  );
}
