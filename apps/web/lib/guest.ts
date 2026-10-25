import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { store, type Guest } from "./store";

// Guests have no account. Their browser holds a signed random token; we store only its hash.
const COOKIE = "dibs_device";
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret(): string {
  const s = process.env.GUEST_COOKIE_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("GUEST_COOKIE_SECRET is not set");
  return "dev-only-guest-secret";
}

const sign = (token: string) => createHmac("sha256", secret()).update(token).digest("base64url");
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function readToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const [token, sig] = raw.split(".");
  if (!token || !sig) return null;
  const expected = Buffer.from(sign(token));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return token;
}

export async function currentGuest(): Promise<Guest | null> {
  const token = readToken((await cookies()).get(COOKIE)?.value);
  return token ? store.findGuestByTokenHash(hash(token)) : null;
}

async function setDeviceCookie(token: string) {
  (await cookies()).set(COOKIE, `${token}.${sign(token)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/** Creates a guest and sets the device cookie. Only call from a server action or route. */
export async function createGuestSession(first_name: string, last_name: string): Promise<Guest> {
  const token = randomBytes(32).toString("base64url");
  const guest = await store.createGuest({ first_name, last_name, tokenHash: hash(token) });
  await setDeviceCookie(token);
  return guest;
}

/**
 * Puts an existing guest on this browser (their rejoin link). A fresh token replaces the old
 * one, so a browser they lost or left behind stops being them. Server action or route only.
 */
export async function resumeGuestSession(guestId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await store.setGuestTokenHash(guestId, hash(token));
  await setDeviceCookie(token);
}

/** A short signature for rejoin links (lib/rejoin.ts), from the same secret as the cookie. */
export const rejoinMac = (text: string) => createHmac("sha256", secret()).update(`rejoin:${text}`).digest("base64url").slice(0, 27);

export async function clearGuestSession() {
  (await cookies()).delete(COOKIE);
}
