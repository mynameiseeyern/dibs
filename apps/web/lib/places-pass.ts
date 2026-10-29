import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Place search costs money per call, so /api/places isn't open to anyone. Someone signed in or
// with a guest session can search; so can someone part-way through making their first plan,
// who has neither yet. The page making the plan hands them this short-lived signed pass.
const TTL_MS = 2 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.GUEST_COOKIE_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("GUEST_COOKIE_SECRET is not set");
  return "dev-only-guest-secret";
}
const mac = (expires: number) => createHmac("sha256", secret()).update(`places:${expires}`).digest("base64url");

/** "1793200000000.abc…": good for two hours. */
export function placesPass(now = Date.now()): string {
  const expires = now + TTL_MS;
  return `${expires}.${mac(expires)}`;
}

export function checkPlacesPass(pass: string | null, now = Date.now()): boolean {
  if (!pass) return false;
  const [e, sig] = pass.split(".");
  const expires = Number(e);
  if (!sig || !Number.isFinite(expires) || expires < now || expires > now + TTL_MS) return false;
  const want = Buffer.from(mac(expires));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
