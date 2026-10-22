"use client";

import { useEffect, useRef } from "react";

/**
 * Put this as the last child of a scrollable list. It opens the list at the bottom (the latest
 * message) and keeps it there as new ones arrive, unless the reader has scrolled up to read back.
 */
export function StickToBottom() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const toBottom = (smooth: boolean) => el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduced ? "smooth" : "auto" });
    toBottom(false);
    let nearBottom = true;
    const onScroll = () => {
      nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // The thread can mount inside a hidden tab (no height yet): snap to the bottom when it gets one.
    const ro = new ResizeObserver(() => {
      if (nearBottom && el.clientHeight > 0) toBottom(false);
    });
    ro.observe(el);
    // New messages (the live refresh swaps children): follow them if we were at the bottom.
    const mo = new MutationObserver(() => {
      if (nearBottom) toBottom(true);
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      mo.disconnect();
      ro.disconnect();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" />;
}
