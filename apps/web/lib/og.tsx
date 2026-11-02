import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";

/**
 * Link previews: what WhatsApp, iMessage, Messenger, Slack and Discord show when someone pastes
 * a Dibby link. Images are drawn with next/og, which can't read CSS variables, so the brand
 * colours are spelled out here once (from packages/ui/tokens.json).
 */
export const OG = {
  violet: "#6D4AFF",
  lime: "#C8F03C",
  ink: "#141216",
  white: "#FFFFFF",
  /** Dibby's eyes and smile. */
  face: "#1E1A22",
  sub: "#5C5866",
  size: { width: 1200, height: 630 },
} as const;

/** Monogram fills, by member colour. */
export const OG_FILL: Record<string, string> = { violet: "#DCD3FF", lime: "#C8F03C", sun: "#FFE7A8", mint: "#BDF2D5", tangerine: "#FFD1BD", sky: "#C9E0FF", coral: "#FFC4CF", rose: "#FFD0E6", aqua: "#BFF0F5", ivory: "#F3EEE4" };

export const SITE_NAME = "Dibby";
export const TAGLINE = "Plans sorted, money square.";
export const SITE_DESCRIPTION = "Get your crew from “we should catch up” to actually going. Dibby finds the spot, the group votes, everyone squares up after. Your friends don’t need the app.";

const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));

export async function ogFonts() {
  return [
    { name: "Bricolage", data: await font("bricolage-grotesque-latin-800-normal.woff"), weight: 800 as const },
    { name: "Figtree", data: await font("figtree-latin-600-normal.woff"), weight: 600 as const },
    { name: "Figtree", data: await font("figtree-latin-800-normal.woff"), weight: 800 as const },
  ];
}

/**
 * Dibby's face, flat: the small-size version of the app icon (the 3D render is mush under 48px,
 * and next/og can't load it anyway). `tile` is the violet square behind it.
 */
export function OgMark({ size, tile = OG.violet, rounded = true }: { size: number; tile?: string; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <rect width="200" height="200" rx={rounded ? 48 : 0} fill={tile} />
      <circle cx="100" cy="104" r="58" fill={OG.lime} />
      <ellipse cx="78" cy="100" rx="7.5" ry="9" fill={OG.face} />
      <ellipse cx="122" cy="100" rx="7.5" ry="9" fill={OG.face} />
      <path d="M89 121Q100 130 111 121" fill="none" stroke={OG.face} strokeWidth="6" strokeLinecap="round" />
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
