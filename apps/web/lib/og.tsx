import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";

/**
 * Link previews: what WhatsApp, iMessage, Messenger, Slack and Discord show when someone pastes
 * a dibs link. Images are drawn with next/og, which can't read CSS variables, so the brand
 * colours are spelled out here once (from packages/ui/tokens.json).
 */
export const OG = {
  violet: "#6D4AFF",
  lime: "#C8F03C",
  ink: "#141216",
  white: "#FFFFFF",
  sub: "#5C5866",
  size: { width: 1200, height: 630 },
} as const;

/** Monogram fills, by member colour. */
export const OG_FILL: Record<string, string> = { violet: "#DCD3FF", lime: "#C8F03C", sun: "#FFE7A8", mint: "#BDF2D5", tangerine: "#FFD1BD", sky: "#C9E0FF", coral: "#FFC4CF", rose: "#FFD0E6", aqua: "#BFF0F5", ivory: "#F3EEE4" };

export const SITE_NAME = "dibs";
export const TAGLINE = "Plans sorted, money square.";
export const SITE_DESCRIPTION = "Get your crew from “we should catch up” to actually going. Dibby plans it, the group votes, everyone squares up after. Your friends don’t need the app.";

const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));

export async function ogFonts() {
  return [
    { name: "Bricolage", data: await font("bricolage-grotesque-latin-800-normal.woff"), weight: 800 as const },
    { name: "Figtree", data: await font("figtree-latin-600-normal.woff"), weight: 600 as const },
    { name: "Figtree", data: await font("figtree-latin-800-normal.woff"), weight: 800 as const },
  ];
}

/** Cards change when the plan does, so the CDN keeps them for a minute and serves stale while it redraws. */
export const OG_HEADERS = { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400" };

/** The "hands up" mark: three friends, one popping up to call dibs. `tile` is the violet square. */
export function OgMark({ size, tile = OG.violet, rounded = true }: { size: number; tile?: string; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <rect width="200" height="200" rx={rounded ? 48 : 0} fill={tile} />
      <circle cx="62" cy="118" r="22" fill={OG.white} fillOpacity="0.55" />
      <circle cx="138" cy="118" r="22" fill={OG.white} fillOpacity="0.55" />
      <circle cx="100" cy="82" r="26" fill={OG.lime} />
      <rect x="92" y="114" width="16" height="36" rx="8" fill={OG.lime} />
    </svg>
  );
}

/**
 * Title and description for a page, mirrored into Open Graph and Twitter so link previews match
 * the page. The preview title is the bare title ("Friday dumplings"): apps show the domain anyway.
 */
export function previewMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website", locale: "en_AU" },
    twitter: { card: "summary_large_image", title, description },
  };
}
