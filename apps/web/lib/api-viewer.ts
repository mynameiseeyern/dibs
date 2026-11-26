import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Organiser } from "./auth";
import type { Guest } from "./store";

/**
 * Who's asking, for requests from the native app. The web works this out from cookies
 * (`whoIsHere` in lib/viewer.ts); the app sends a bearer token or a guest pass instead
 * (lib/api-auth.ts). Running a plan action inside `asViewer` makes `whoIsHere` answer with
 * the app's person, so the app goes through exactly the same actions, and the same rules
 * (capacity, the waitlist, who can vote or chat), as the web.
 */

type Who = { organiser: Organiser | null; guest: Guest | null };

const viewer = new AsyncLocalStorage<Who>();

export function asViewer<T>(who: Who, fn: () => Promise<T>): Promise<T> {
  return viewer.run(who, fn);
}

/** The app's person when inside `asViewer`, otherwise undefined (use cookies). */
export function apiHere(): Who | undefined {
  return viewer.getStore();
}
