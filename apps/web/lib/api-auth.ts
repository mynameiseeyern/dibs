import { siteUrl } from "@/lib/site";
import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AuthSession } from "@dibs/shared/api";
import type { Organiser } from "./auth";
import { store, usingSupabase, type Guest } from "./store";

/**
 * Sign-in for the native app. The web uses cookies (`lib/auth.ts`); the phone sends
 * `Authorization: Bearer <access_token>` from a session it got with an emailed code.
 * Kept apart from the cookie path so the web's sign-in is untouched.
 */

/** No cookies, no storage: one call, then thrown away. */
function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Demo mode (no Supabase): any 6-digit code signs in, and the "token" names a made-up user.
const DEMO_PREFIX = "demo.";

/** The account behind the request's bearer token, or null. */
export async function apiOrganiser(req: Request): Promise<Organiser | null> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  if (!usingSupabase) return token.startsWith(DEMO_PREFIX) ? { id: token.slice(DEMO_PREFIX.length), email: null } : null;
  // Checked locally against the project's signing keys, like the web's cookie path.
  const { data, error } = await anonClient().auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" && claims.email ? claims.email : null };
}

/**
 * Guests on the phone, like the web's device cookie: a random token the app keeps in the
 * keychain and sends as `X-Dibby-Guest`. We store only its hash, so holding the token is the proof.
 */
const GUEST_HEADER = "x-dibby-guest";
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function apiGuest(req: Request): Promise<Guest | null> {
  const token = req.headers.get(GUEST_HEADER)?.trim();
  if (!token || token.length < 32 || token.length > 100) return null;
  return store.findGuestByTokenHash(hashToken(token)).catch(() => null);
}

/** A new guest and the token the app keeps for them. Only once everything else checks out. */
export async function newApiGuest(first: string, last: string): Promise<{ guest: Guest; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const guest = await store.createGuest({ first_name: first, last_name: last, tokenHash: hashToken(token) });
  return { guest, token };
}

/** Where an app-asked sign-in email's button goes. Must be in Supabase's redirect URLs. */
export const APP_SIGN_IN_URL = () => `${siteUrl()}/auth/app`;

export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Emails a sign-in code. The same email as the web's link; the template carries both. */
export async function sendCode(email: string): Promise<{ error?: string }> {
  if (!usingSupabase || reviewLogin(email)) return {};
  // The email template links to /auth/app when it sees this, so the button opens the app.
  const { error } = await anonClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: APP_SIGN_IN_URL() } });
  if (!error) return {};
  console.error("[api sign-in]", error.status, error.code, error.message);
  if (error.status === 429 || /rate limit/i.test(error.message)) return { error: "Too many sign-in emails just now. Give it a bit and try again." };
  return { error: "Couldn't send the code. Try again in a sec." };
}

/** The button in an app-asked sign-in email: the token hash from the link, for a session. */
export async function verifyLink(tokenHash: string): Promise<AuthSession | { error: string }> {
  if (!usingSupabase) return { error: "Sign-in links need Supabase." };
  const { data, error } = await anonClient().auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error || !data.session) {
    if (error) console.error("[api verify link]", error.status, error.code, error.message);
    return { error: "That link's expired or been used. Get a new code." };
  }
  return toSession(data.session);
}

export async function verifyCode(email: string, code: string): Promise<AuthSession | { error: string }> {
  if (!usingSupabase) {
    return /^\d{6}$/.test(code)
      ? { access_token: DEMO_PREFIX + randomUUID(), refresh_token: "demo", expires_at: Math.floor(Date.now() / 1000) + 30 * 86400 }
      : { error: "That code doesn't look right." };
  }
  const review = reviewLogin(email);
  if (review) return review.code === code ? reviewSession(email) : { error: "That code didn't work. Check it, or get a new one." };
  const { data, error } = await anonClient().auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.session) {
    if (error) console.error("[api verify]", error.status, error.code, error.message);
    return { error: "That code didn't work. Check it, or get a new one." };
  }
  return toSession(data.session);
}

/**
 * App Review can't get an emailed code, and Apple requires a working demo login (2.1). Off unless
 * APP_REVIEW_EMAIL and APP_REVIEW_CODE are set. Only ever one throwaway account with no real data.
 */
function reviewLogin(email: string): { code: string } | null {
  const reviewEmail = process.env.APP_REVIEW_EMAIL?.trim().toLowerCase();
  const code = process.env.APP_REVIEW_CODE?.trim();
  return reviewEmail && code && /^\d{6}$/.test(code) && email === reviewEmail ? { code } : null;
}

/** Mints a real one-time code with the service key and redeems it, so it's an ordinary session. */
async function reviewSession(email: string): Promise<AuthSession | { error: string }> {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  await service.auth.admin.createUser({ email, email_confirm: true }).catch(() => null); // Already there is fine.
  const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.email_otp) {
    console.error("[api review login]", linkError?.message);
    return { error: "That code didn't work. Check it, or get a new one." };
  }
  const { data, error } = await anonClient().auth.verifyOtp({ email, token: link.properties.email_otp, type: "email" });
  if (error || !data.session) return { error: "That code didn't work. Check it, or get a new one." };
  return toSession(data.session);
}

export async function refreshSession(refreshToken: string): Promise<AuthSession | { error: string }> {
  if (!usingSupabase) return { error: "Sign in again." };
  const { data, error } = await anonClient().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return { error: "Sign in again." };
  return toSession(data.session);
}

function toSession(s: { access_token: string; refresh_token: string; expires_at?: number; expires_in: number }): AuthSession {
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + s.expires_in };
}

/** `{ error }` with a status, never cached. */
export function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The JSON body as a plain object, or {} when it isn't one. */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
