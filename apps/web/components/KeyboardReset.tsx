"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * iPhones (Safari and Chrome both use WebKit) can leave the page in the shape it had while the
 * keyboard was up: extra blank space at the bottom and the pinned button scrolling with the
 * page, until a reload. It happens when the keyboard closes as a sheet shuts or the page moves
 * on. When the keyboard goes away, or the page changes, nudge the browser to lay the page out
 * again by scrolling to where it already is, clamped to the real content.
 */
export function KeyboardReset() {
  const path = usePathname();

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let last = vv.height;
    const onResize = () => {
      // Grew by more than a toolbar's worth: the keyboard just closed.
      if (vv.height > last + 120) settle();
      last = vv.height;
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // A new page shouldn't inherit the keyboard from the last one.
  useEffect(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el.matches("input, textarea, [contenteditable]")) el.blur();
    settle();
  }, [path]);

  return null;
}

function settle() {
  requestAnimationFrame(() => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(window.scrollX, Math.min(window.scrollY, max));
  });
}
