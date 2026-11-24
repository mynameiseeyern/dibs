import Constants from "expo-constants";
import type { AccountInfo, AuthSession, JoinResponse, Me, MyPlans, NewPlanRequest, NewPlanResponse, PlaceHit, PlaceInfo, PlanDetail, PlanSummary } from "@dibs/shared/api";

/** The web app is the backend: the phone never talks to the database directly. */
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? "https://dibby.social";

/** An error from the API, with copy that's fine to show (`{ error }` from /api/v1). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Which answer it's about ("title", "first"…), so the form can go back to that question. */
    readonly field?: string
  ) {
    super(message);
  }
}

/** Set by `lib/session.tsx`: hands back a fresh access token, or null when signed out. */
let tokenSource: () => Promise<string | null> = async () => null;
export function setTokenSource(fn: () => Promise<string | null>) {
  tokenSource = fn;
}

/** Set by `lib/session.tsx`: the guest pass on this phone, if there is one. */
let guestSource: () => string | null = () => null;
export function setGuestSource(fn: () => string | null) {
  guestSource = fn;
}

/** Called when the API says the session's gone, so the app can drop back to sign-in. */
let onSignedOut: () => void = () => {};
export function setSignedOutHandler(fn: () => void) {
  onSignedOut = fn;
}

type Opts = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; auth?: boolean };

export async function call<T>(path: string, { method = "GET", body, auth = true }: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let sentToken = false;
  if (auth) {
    const token = await tokenSource();
    if (token) headers.Authorization = `Bearer ${token}`;
    sentToken = Boolean(token);
    const guest = guestSource();
    if (guest) headers["X-Dibby-Guest"] = guest;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError("Can't reach the internet. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && sentToken) onSignedOut();
    const field = data && typeof data.field === "string" ? data.field : undefined;
    throw new ApiError((data && typeof data.error === "string" && data.error) || `Something went wrong (${res.status}).`, res.status, field);
  }
  return data as T;
}

// Public
export async function getPlan(slug: string): Promise<PlanSummary | null> {
  try {
    return await call<PlanSummary>(`/api/v1/plans/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// Sign-in
export const sendCode = (email: string) => call<{ sent: string }>("/api/v1/auth/code", { method: "POST", body: { email }, auth: false });
export const verifyCode = (email: string, code: string) => call<AuthSession>("/api/v1/auth/verify", { method: "POST", body: { email, code }, auth: false });
export const verifyLink = (token_hash: string) => call<AuthSession>("/api/v1/auth/verify", { method: "POST", body: { token_hash }, auth: false });
export const refresh = (refresh_token: string) => call<AuthSession>("/api/v1/auth/refresh", { method: "POST", body: { refresh_token }, auth: false });

// Account
export const getMe = () => call<Me>("/api/v1/me");
export const saveName = (first: string, last: string) => call<Me>("/api/v1/me", { method: "PUT", body: { first, last } });
export const deleteAccount = () => call<{ deleted: true }>("/api/v1/me", { method: "DELETE" });
export const getMyPlans = () => call<MyPlans>("/api/v1/me/plans");

// Making a plan: no account needed
export const createPlan = (plan: NewPlanRequest) => call<NewPlanResponse>("/api/v1/plans", { method: "POST", body: plan });

// A plan, as the person on this phone sees it, and taking part in it.
const plan = (slug: string, path = "") => `/api/v1/plans/${encodeURIComponent(slug)}${path}`;
export const getPlanDetail = (slug: string) => call<PlanDetail>(plan(slug, "/view"));
export const joinPlan = (slug: string, rsvp: "in" | "maybe", name?: { first: string; last: string }) =>
  call<JoinResponse & { detail: PlanDetail }>(plan(slug, "/join"), { method: "POST", body: { rsvp, ...name } });
export const setRsvp = (slug: string, rsvp: "in" | "maybe" | "out") => call<PlanDetail>(plan(slug, "/rsvp"), { method: "POST", body: { rsvp } });
export const castVote = (slug: string, optionId: string) => call<PlanDetail>(plan(slug, "/vote"), { method: "POST", body: { option_id: optionId } });
export const addPlace = (slug: string, name: string, address: string) => call<PlanDetail>(plan(slug, "/options"), { method: "POST", body: { name, address } });
/** A business picked from the place search (the server checks it with Google). */
export const addMapPlace = (slug: string, placeId: string) => call<PlanDetail>(plan(slug, "/options"), { method: "POST", body: { place_id: placeId } });
/** A host closes the vote now and locks in the leader. */
export const lockPlan = (slug: string) => call<PlanDetail>(plan(slug, "/lock"), { method: "POST" });

// Places: the web's map picker and place cards, through the server (the Google key stays there).
let pass: { value: string; at: number } | null = null;
/** Someone with no account or guest pass yet (making a first plan) searches with a short-lived pass. */
async function placesPass(): Promise<string> {
  if (pass && Date.now() - pass.at < 10 * 60_000) return pass.value;
  const { pass: value } = await call<{ pass: string }>("/api/v1/places/pass", { auth: false });
  pass = { value, at: Date.now() };
  return value;
}
const placesQuery = async (params: Record<string, string>) => {
  const p = new URLSearchParams(params);
  if (!guestSource() && !(await tokenSource())) p.set("pass", await placesPass());
  return p.toString();
};
export async function searchPlaces(q: string, near?: { area?: string | null }): Promise<PlaceHit[]> {
  const res = await call<{ places: PlaceHit[] }>(`/api/v1/places?${await placesQuery({ q, ...(near?.area ? { area: near.area } : {}) })}`);
  return res.places;
}
export async function getPlaceInfo(placeId: string, full = false): Promise<PlaceInfo> {
  return call<PlaceInfo>(`/api/v1/places/${encodeURIComponent(placeId)}?${await placesQuery({})}${full ? "&full=1" : ""}`);
}
export const sendMessage = (slug: string, body: string) => call<PlanDetail>(plan(slug, "/messages"), { method: "POST", body: { body } });

/** "https://dibby.social/p/k7m2qx9a", "dibby.social/p/k7m2qx9a" or just "k7m2qx9a". */
export function slugFrom(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/p\/([a-z0-9]{4,32})/i) ?? s.match(/^([a-z0-9]{4,32})$/i);
  return m ? m[1].toLowerCase() : null;
}

/** The bell on the chat: mute or unmute Dibby's nudges for you on this plan. */
export const toggleDibbyMute = (slug: string) => call<PlanDetail>(plan(slug, "/mute"), { method: "POST" });

/** Add or take back a reaction (👍 ❤️ 😂 🎉) on a chat message. */
export const reactTo = (slug: string, messageId: string, emoji: string) =>
  call<PlanDetail>(plan(slug, `/messages/${encodeURIComponent(messageId)}/react`), { method: "POST", body: { emoji } });

/** What the web's /account shows, for whoever's on this phone. */
export const getAccount = () => call<AccountInfo>("/api/v1/me/account");
/** Beta update emails on or off. */
export const setBetaUpdates = (on: boolean) => call<AccountInfo>("/api/v1/me/account", { method: "PUT", body: { beta_updates: on } });
/** A new calendar subscription link; the old one stops working. */
export const resetCalendarLink = () => call<AccountInfo>("/api/v1/me/calendar", { method: "POST" });
