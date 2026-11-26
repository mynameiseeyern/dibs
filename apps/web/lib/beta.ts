import "server-only";

/**
 * The app's beta (TestFlight on iPhone, Play testing on Android). The links live in env vars so
 * opening or closing the beta is a Vercel setting, not a deploy:
 *
 *   TESTFLIGHT_URL     https://testflight.apple.com/join/XXXXXXXX  (the external group's public link)
 *   PLAY_TESTING_URL   https://play.google.com/apps/testing/<package>  (Play internal/closed testing)
 *
 * With neither set, /app is the waitlist, as before.
 */

/** Apple's TestFlight app on the App Store. */
export const TESTFLIGHT_APP = "https://apps.apple.com/app/testflight/id899247664";

export function betaLinks(): { ios: string | null; android: string | null } {
  const ios = process.env.TESTFLIGHT_URL?.trim() || null;
  const android = process.env.PLAY_TESTING_URL?.trim() || null;
  return {
    ios: ios && /^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]+$/.test(ios) ? ios : null,
    android: android && /^https:\/\/play\.google\.com\//.test(android) ? android : null,
  };
}

export type Device = "ios" | "android" | "desktop";

export function deviceFrom(userAgent: string | null): Device {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Where someone was headed before "Get the app": a crew invite or a plan. Kept through /app so
 * that once the app's in, "Open your invite" takes them straight back. Only these two shapes.
 */
export function safeNext(next: string | undefined | null): string | null {
  if (!next) return null;
  return /^\/c\/[A-Za-z0-9_-]{20,64}$/.test(next) || /^\/p\/[A-Za-z0-9]{4,32}$/.test(next) ? next : null;
}

/**
 * The same place in the app, by its own link scheme. A dibby.social link tapped while already on
 * dibby.social stays in Safari (iOS doesn't open the app for same-site taps), so this uses dibby://.
 */
export function inApp(next: string): string {
  return `dibby:/${next}`;
}
