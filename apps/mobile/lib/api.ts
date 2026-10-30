import Constants from "expo-constants";
import type { PlanSummary } from "@dibs/shared/api";

/** The web app is the backend: the phone never talks to the database directly. */
const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? "https://dibby.social";

export async function getPlan(slug: string): Promise<PlanSummary | null> {
  const res = await fetch(`${API_URL}/api/v1/plans/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Couldn't load that plan (${res.status}).`);
  return res.json();
}

/** "https://dibby.social/p/k7m2qx9a", "dibby.social/p/k7m2qx9a" or just "k7m2qx9a". */
export function slugFrom(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/p\/([a-z0-9]{4,32})/i) ?? s.match(/^([a-z0-9]{4,32})$/i);
  return m ? m[1].toLowerCase() : null;
}
