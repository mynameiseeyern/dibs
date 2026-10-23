"use client";

import * as Sentry from "@sentry/nextjs";
import { toast } from "@/components/ui/toast";

/**
 * Runs a server action from a tap, the reliable way (ARV-53):
 * - "Saving…" shows if it takes more than a moment.
 * - If the connection drops, it waits for the phone to come back online and tries again
 *   (twice), but only for actions that are safe to repeat. A toggle isn't: sending it twice
 *   would undo it.
 * - If it still fails, a clear message with "Try again".
 * Returns the action's result, or undefined if it never got through.
 */
export async function send<T>(action: () => Promise<T>, opts: { retry?: boolean; what?: string } = {}): Promise<T | undefined> {
  const { retry = true, what = "that" } = opts;
  const saving = setTimeout(() => toast.info("Saving…", { id: "saving", duration: Infinity }), 800);
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await action();
      } catch (err) {
        if (!retry || !isNetwork(err) || attempt >= 2) throw err;
        toast.info("Connection dropped. Trying again…", { id: "saving", duration: Infinity });
        await backOnline(attempt === 0 ? 1000 : 3000);
      }
    }
  } catch (err) {
    console.error("[send]", err);
    if (!isNetwork(err)) Sentry.captureException(err, { tags: { area: `action:${what}` } });
    toast.error(`Couldn't save ${what}`, {
      description: isNetwork(err) || !navigator.onLine ? "Looks like you're offline. Check your connection." : "Something went wrong on our end.",
      retry: () => void send(action, opts),
      duration: 8000,
    });
    return undefined;
  } finally {
    clearTimeout(saving);
    toast.dismiss("saving");
  }
}

/** fetch failed before a response: offline, dropped, or a flaky network. */
function isNetwork(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /Failed to fetch|NetworkError|Load failed|network|fetch failed|TypeError/i.test(msg);
}

/** Waits `ms`, and if offline, until the phone is back online (up to 30s). */
function backOnline(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener("online", done);
      clearTimeout(cap);
      setTimeout(resolve, 300);
    };
    const cap = setTimeout(done, 30_000);
    if (navigator.onLine) {
      clearTimeout(cap);
      setTimeout(resolve, ms);
    } else window.addEventListener("online", done);
  });
}
