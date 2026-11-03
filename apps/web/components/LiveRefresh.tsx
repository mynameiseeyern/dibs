"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const FAST = 3_000; // just after something happened
const SLOW = 15_000; // a quiet page
const HOT_FOR = 60_000; // stay fast this long after the last change or tap
const SLEEP_AFTER = 5 * 60_000; // stop polling after this long with nothing new

/**
 * Re-fetches the page while it's visible, so RSVPs, votes and messages from other
 * phones show up. Each refresh is a server render on Vercel, so it backs off:
 * every 3s for a minute after anything happens, then every 15s, then it stops after
 * 5 minutes with no change. A tap, a key, focusing the tab or coming back to it
 * wakes it (and refreshes straight away if it had stopped).
 *
 * `version` is a short hash of the page's data from the server; when a refresh
 * brings a new one, something changed and it speeds back up.
 * Swap for Supabase Realtime once it's wired.
 */
export function LiveRefresh({ version }: { version?: string }) {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const wake = useRef<() => void>(() => {});

  // New data from the server: someone voted, RSVP'd or posted.
  useEffect(() => {
    wake.current();
  }, [version]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pace: number | null = null; // the delay the pending timer was set with

    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      pace = null;
    };
    const idle = () => Date.now() - lastActivity.current;
    const schedule = () => {
      stop();
      if (document.visibilityState !== "visible" || idle() > SLEEP_AFTER) return; // asleep
      pace = idle() < HOT_FOR ? FAST : SLOW;
      timer = setTimeout(tick, pace);
    };
    const tick = () => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
      if (!typing) router.refresh();
      schedule();
    };
    // Something happened: go fast again. If polling had stopped, catch up now.
    const poke = () => {
      lastActivity.current = Date.now();
      if (document.visibilityState !== "visible") return;
      if (pace === null) {
        router.refresh();
        schedule();
      } else if (pace !== FAST) schedule();
    };
    const onVisibility = () => (document.visibilityState === "visible" ? poke() : stop());

    wake.current = poke;
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", poke);
    window.addEventListener("pointerdown", poke, { passive: true });
    window.addEventListener("keydown", poke);
    return () => {
      stop();
      wake.current = () => {};
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", poke);
      window.removeEventListener("pointerdown", poke);
      window.removeEventListener("keydown", poke);
    };
  }, [router]);

  return null;
}
