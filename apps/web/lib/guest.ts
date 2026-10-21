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

/** Creates a guest and sets the device cookie. Only call from a server action or route. */
export async function createGuestSession(first_name: string, last_name: string): Promise<Guest> {
  const token = randomBytes(32).toString("base64url");
  const guest = await store.createGuest({ first_name, last_name, tokenHash: hash(token) });
  (await cookies()).set(COOKIE, `${token}.${sign(token)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return guest;
}

export async function clearGuestSession() {
  (await cookies()).delete(COOKIE);
}
