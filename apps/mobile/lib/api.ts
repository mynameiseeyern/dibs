import Constants from "expo-constants";
import type { AuthSession, Me, MyPlan, PlanSummary } from "@dibs/shared/api";

/** The web app is the backend: the phone never talks to the database directly. */
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? "https://dibby.social";

/** An error from the API, with copy that's fine to show (`{ error }` from /api/v1). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Set by `lib/session.tsx`: hands back a fresh access token, or null when signed out. */
let tokenSource: () => Promise<string | null> = async () => null;
export function setTokenSource(fn: () => Promise<string | null>) {
  tokenSource = fn;
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
  if (auth) {
    const token = await tokenSource();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError("Can't reach the internet. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) onSignedOut();
    throw new ApiError((data && typeof data.error === "string" && data.error) || `Something went wrong (${res.status}).`, res.status);
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
export const deleteAccount = () => call<{ deleted: true }>("/api/v1/me", { method: "DELETE" });
export const getMyPlans = () => call<{ upcoming: MyPlan[]; past: MyPlan[] }>("/api/v1/me/plans");

/** "https://dibby.social/p/k7m2qx9a", "dibby.social/p/k7m2qx9a" or just "k7m2qx9a". */
export function slugFrom(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/p\/([a-z0-9]{4,32})/i) ?? s.match(/^([a-z0-9]{4,32})$/i);
  return m ? m[1].toLowerCase() : null;
}
