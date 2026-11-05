import { toMyPlan, type MyPlan } from "@dibs/shared/api";
import { apiError, apiJson, apiOrganiser } from "@/lib/api-auth";
import { track } from "@/lib/events";
import { store } from "@/lib/store";
import { formatShort } from "@/lib/time";

export const dynamic = "force-dynamic";

const SIX_HOURS = 6 * 3600 * 1000;

/** The phone's home screen: plans you're on, upcoming first (soonest first), then the last few past. */
export async function GET(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);

  // Plans joined as a guest with this email come across, like signing in on the web.
  try {
    const moved = await store.claimGuests(me.id, me.email, null);
    if (moved > 0) await track({ name: "account_created", userId: me.id, props: { via: "guest_claim", plans: moved, app: true } });
  } catch (e) {
    console.error("[api claim guests]", e);
  }

  const rows = await store.listPlansForUser(me.id);
  const plans: MyPlan[] = await Promise.all(
    rows.map(async ({ plan, member }) => toMyPlan(plan, await store.listMembers(plan.id), member, formatShort(plan.starts_at)))
  );
  const upcoming = (p: MyPlan) => (p.status === "voting" || p.status === "locked") && (!p.starts_at || Date.parse(p.starts_at) > Date.now() - SIX_HOURS);
  const soonest = (a: MyPlan, b: MyPlan) => (a.starts_at ? Date.parse(a.starts_at) : Infinity) - (b.starts_at ? Date.parse(b.starts_at) : Infinity);
  const next = plans.filter(upcoming).sort(soonest);
  const past = plans.filter((p) => !upcoming(p)).sort((a, b) => soonest(b, a)).slice(0, 5);
  return apiJson({ upcoming: next, past });
}
