/**
 * The site's public address, for share links, magic links and preview cards.
 * Uses NEXT_PUBLIC_SITE_URL if set (your own domain), otherwise Vercel's production
 * URL, otherwise localhost. So the first Vercel deploy works without setting it.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && !(process.env.VERCEL && explicit.includes("localhost"))) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
