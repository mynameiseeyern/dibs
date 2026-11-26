import "server-only";
import { currentOrganiser } from "./auth";
import { usingSupabase } from "./store";

/** Signed in with an email listed in METRICS_EMAILS. Anyone signed in, in local demo mode. */
export async function isAdmin(): Promise<boolean> {
  const me = await currentOrganiser();
  if (!me) return false;
  if (!usingSupabase) return true;
  const list = (process.env.METRICS_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return Boolean(me.email && list.includes(me.email.toLowerCase()));
}
