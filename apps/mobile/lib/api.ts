import Constants from "expo-constants";
import type { AuthSession, Me, MyPlans, NewPlanRequest, NewPlanResponse, PlanSummary } from "@dibs/shared/api";

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
export const refresh = (refresh_token: string) => call<AuthSession>("/api/v1/auth/refresh", { method: "POST", body: { refresh_token }, auth: false });

// Account
export const getMe = () => call<Me>("/api/v1/me");
export const saveName = (first: string, last: string) => call<Me>("/api/v1/me", { method: "PUT", body: { first, last } });
export type ReportBody = { kind: "plan" | "message" | "member" | "photo"; target_id?: string; reason: string; note?: string; block?: boolean };
export const reportContent = (slug: string, body: ReportBody) => call<{ reported: true }>(`/api/v1/plans/${encodeURIComponent(slug)}/report`, { method: "POST", body });
export const deleteAccount = () => call<{ deleted: true }>("/api/v1/me", { method: "DELETE" });
export const getMyPlans = () => call<MyPlans>("/api/v1/me/plans");

// Making a plan: no account needed
export const createPlan = (plan: NewPlanRequest) => call<NewPlanResponse>("/api/v1/plans", { method: "POST", body: plan });

/** "https://dibby.social/p/k7m2qx9a", "dibby.social/p/k7m2qx9a" or just "k7m2qx9a". */
export function slugFrom(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/p\/([a-z0-9]{4,32})/i) ?? s.match(/^([a-z0-9]{4,32})$/i);
  return m ? m[1].toLowerCase() : null;
}
