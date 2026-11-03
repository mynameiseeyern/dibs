import "server-only";
import { createHash } from "node:crypto";

/**
 * A short hash of what a live page shows, for `<LiveRefresh version>`. When a
 * refresh brings back a different one, something changed and polling speeds up.
 * Only a hash goes to the browser, never the data itself.
 */
export function liveVersion(...parts: unknown[]): string {
  return createHash("sha1").update(JSON.stringify(parts)).digest("base64url").slice(0, 12);
}
