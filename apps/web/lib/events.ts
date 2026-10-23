import "server-only";
import type { AppEvent } from "@dibs/shared/metrics";
import { store } from "@/lib/store";

/**
 * Log one of the pilot's events (ARV-50). Never throws and never blocks on a failure: a lost
 * event mustn't break what the person was doing. IDs only, never names or amounts.
 */
export async function track(e: AppEvent): Promise<void> {
  try {
    await store.logEvent(e);
  } catch (err) {
    console.warn("[events]", e.name, err);
  }
}
