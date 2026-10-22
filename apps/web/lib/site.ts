/**
 * The site's public address, for share links, magic links and preview cards.
 * Uses SITE_URL (or the older NEXT_PUBLIC_SITE_URL) if set to your own domain, otherwise
 * Vercel's production URL, otherwise localhost. Only read on the server, so it doesn't
 * need the public prefix and can be a Sensitive variable in Vercel.
 */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && !(process.env.VERCEL && explicit.includes("localhost"))) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
