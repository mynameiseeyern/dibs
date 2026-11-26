import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/** How long the splash screen waits for a new version on a cold start before showing the one it has. */
const COLD_START_WAIT_MS = 3000;
/** Coming back to the app after this long checks for a new version again. */
const RECHECK_AFTER_MS = 10 * 60 * 1000;

const live = Updates.isEnabled && !__DEV__;

/** Checks for a new version and downloads it. True when one is ready to start. */
async function fetchNew(): Promise<boolean> {
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    const got = await Updates.fetchUpdateAsync();
    return got.isNew;
  } catch {
    return false; // offline or the update server is down: keep the version we have
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

/**
 * Keeps the app on the newest version without a second relaunch.
 * - Cold start: while the splash is up, waits up to 3s for a new version and restarts straight into it.
 *   Returns false until that's settled, so the root layout keeps the splash showing.
 * - Back from the background: restarts into a version downloaded while away, or checks again after 10 min.
 *   The restart happens as the app comes forward, before anything can be tapped.
 */
export function useLatestVersion(): boolean {
  const [ready, setReady] = useState(!live);
  const pending = useRef(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    lastCheck.current = Date.now();
    const download = fetchNew();
    download.then((isNew) => {
      if (isNew) pending.current = true;
    });
    withTimeout(download, COLD_START_WAIT_MS, false).then((isNew) => {
      if (cancelled) return;
      if (isNew) Updates.reloadAsync().catch(() => setReady(true));
      else setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!live) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      if (pending.current) {
        Updates.reloadAsync().catch(() => {});
        return;
      }
      if (Date.now() - lastCheck.current < RECHECK_AFTER_MS) return;
      lastCheck.current = Date.now();
      // Downloaded in the background; it starts the next time the app comes forward.
      fetchNew().then((isNew) => {
        if (isNew) pending.current = true;
      });
    });
    return () => sub.remove();
  }, []);

  return ready;
}
