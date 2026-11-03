"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { realtimeClient } from "@/lib/realtime";

const FAST = 3_000; // just after something happened
const SLOW = 15_000; // a quiet page
const HOT_FOR = 60_000; // stay fast this long after the last change or tap
const SLEEP_AFTER = 5 * 60_000; // stop polling after this long with nothing new
const PING_DEBOUNCE = 300; // a vote can touch a few rows: one refresh for the lot
const TYPING_RETRY = 1_500;

/**
 * Keeps a plan page current, so RSVPs, votes and messages from other phones show up.
 *
 * With Supabase set up and `planId` given, it listens for the "changed" ping on the
 * plan's Realtime topic (supabase/migrations/0025_live_pings.sql) and re-fetches only
 * then. The ping has no data in it: the page re-renders on the server as usual.
 * It also re-fetches when you come back to the tab or the connection comes back,
 * since pings sent while away are missed.
 *
 * Without Realtime (demo mode, or while it's not connected) it polls, backing off:
 * every 3s for a minute after anything happens, then every 15s, then it stops after
 * 5 minutes with no change. A tap, a key, focusing or coming back to the tab wakes it.
 *
 * `version` is a short hash of the page's data from the server; a refresh that
 * brings a new one means something changed, so polling speeds back up.
 */
export function LiveRefresh({ planId, version }: { planId?: string; version?: string }) {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const wake = useRef<() => void>(() => {});

  // New data from the server: someone voted, RSVP'd or posted.
  useEffect(() => {
    wake.current();
  }, [version]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pace: number | null = null; // the delay the pending poll was set with
    let live = false; // Realtime is connected: no polling needed
    let pingTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const visible = () => document.visibilityState === "visible";
    const typing = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
    };

    // Polling, for when Realtime isn't there.
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      pace = null;
    };
    const idle = () => Date.now() - lastActivity.current;
    const schedule = () => {
      stop();
      if (live || !visible() || idle() > SLEEP_AFTER) return;
      pace = idle() < HOT_FOR ? FAST : SLOW;
      timer = setTimeout(tick, pace);
    };
    const tick = () => {
      if (!typing()) router.refresh();
      schedule();
    };
    // Something happened: go fast again. If polling had stopped, catch up now.
    const poke = () => {
      lastActivity.current = Date.now();
      if (live || !visible()) return;
      if (pace === null) {
        router.refresh();
        schedule();
      } else if (pace !== FAST) schedule();
    };

    // Realtime: refresh when the plan says it changed.
    const refreshSoon = (delay = PING_DEBOUNCE) => {
      if (pingTimer) clearTimeout(pingTimer);
      pingTimer = setTimeout(() => {
        pingTimer = undefined;
        if (!visible()) return; // caught up when they come back
        if (typing()) return refreshSoon(TYPING_RETRY); // don't yank the page mid-message
        router.refresh();
      }, delay);
    };

    const onVisibility = () => {
      if (!visible()) return stop();
      if (live) refreshSoon(0);
      else poke();
    };

    const supabase = planId ? realtimeClient() : null;
    let connectedBefore = false;
    const channel = supabase
      ?.channel(`plan:${planId}`)
      .on("broadcast", { event: "changed" }, () => refreshSoon())
      .subscribe((status) => {
        if (disposed) return; // removeChannel on unmount reports CLOSED
        if (status === "SUBSCRIBED") {
          live = true;
          stop();
          if (connectedBefore) refreshSoon(0); // back after a drop: catch up
          connectedBefore = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          live = false;
          lastActivity.current = Date.now();
          schedule(); // poll until it reconnects
        }
      });

    wake.current = poke;
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", poke);
    window.addEventListener("pointerdown", poke, { passive: true });
    window.addEventListener("keydown", poke);
    return () => {
      disposed = true;
      stop();
      if (pingTimer) clearTimeout(pingTimer);
      wake.current = () => {};
      if (channel && supabase) void supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", poke);
      window.removeEventListener("pointerdown", poke);
      window.removeEventListener("keydown", poke);
    };
  }, [router, planId]);

  return null;
}
