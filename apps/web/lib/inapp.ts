import "server-only";
import { headers } from "next/headers";
import { inAppBrowser, type InApp } from "@dibs/shared/inapp";

/** The app whose built-in browser this request came from (Messenger, Instagram…), or null. */
export async function currentInApp(): Promise<InApp | null> {
  return inAppBrowser((await headers()).get("user-agent"));
}
