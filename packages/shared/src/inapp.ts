// In-app browsers: links tapped in Messenger, Instagram, Facebook, TikTok or Snapchat open in the
// app's own browser, which keeps its own cookies. Someone signed in (or a guest) in Safari or
// Chrome is a stranger there, so plan pages suggest opening the link in their real browser.

export type InAppName = "Messenger" | "Instagram" | "Facebook" | "TikTok" | "Snapchat" | "LinkedIn";
export type InApp = { app: InAppName; os: "ios" | "android" | "other" };

const APPS: [InAppName, RegExp][] = [
  // Messenger before Facebook: both carry FBAN/FBAV, Messenger adds its own marker.
  ["Messenger", /MessengerForiOS|FB_IAB\/(MESSENGER|Orca)|Orca-Android|FBAN\/Messenger/i],
  ["Instagram", /Instagram/i],
  ["Facebook", /FBAN\/|FBAV\/|FB_IAB\/|FBIOS|FB4A/i],
  ["TikTok", /musical_ly|BytedanceWebview|TikTok/i],
  ["Snapchat", /Snapchat/i],
  ["LinkedIn", /LinkedInApp/i],
];

/** Which app's browser this is, or null for a normal browser. */
export function inAppBrowser(ua: string | null | undefined): InApp | null {
  if (!ua) return null;
  const hit = APPS.find(([, re]) => re.test(ua));
  if (!hit) return null;
  const os = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other";
  return { app: hit[0], os };
}

/**
 * A link that asks the phone to open `url` in its own browser. Android: an intent with no
 * package, so it opens the default browser. iPhone: Safari's scheme (iOS 17 and up; older ones
 * ignore it, which is why the banner also says how to do it by hand). Null: no shortcut.
 */
export function openInBrowserHref(url: string, os: InApp["os"]): string | null {
  const u = new URL(url);
  if (u.protocol !== "https:") return null;
  const rest = `${u.host}${u.pathname}${u.search}`;
  if (os === "android") return `intent://${rest}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  if (os === "ios") return `x-safari-https://${rest}`;
  return null;
}

/** How to do it by hand, in that app. */
export function openByHand(app: InAppName, os: InApp["os"]): string {
  const browser = os === "ios" ? "Safari" : "your browser";
  if (app === "Instagram" || app === "TikTok" || app === "Snapchat") return `Tap ··· at the top, then open in ${browser}.`;
  return `Tap ··· at the top, then Open in ${browser}.`;
}
