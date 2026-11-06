import { toMyPlan, type MyPlan } from "@dibs/shared/api";
import { apiError, apiGuest, apiJson, apiOrganiser } from "@/lib/api-auth";
import { track } from "@/lib/events";
import { store } from "@/lib/store";
import { formatShort } from "@/lib/time";

export const dynamic = "force-dynamic";

const SIX_HOURS = 6 * 3600 * 1000;

/**
 * The phone's home screen: plans you're on, upcoming first (soonest first), then the last few past.
 * Works for a guest pass too. Signed in with the guest pass still on the phone, its plans move onto
 * the account (`claimed`), so the app can drop the pass.
 */
export async function GET(req: Request) {
  const me = await apiOrganiser(req);
  const guest = await apiGuest(req);
  if (!me) {
    if (!guest) return apiError("Sign in again.", 401);
    return apiJson(await listed(await store.listPlansForGuest(guest.id)));
  }

  // Plans made or joined as a guest (on this phone, or with this email) come across, like signing in on the web.
  let claimed = 0;
  try {
    const moved = (claimed = await store.claimGuests(me.id, me.email, guest?.id ?? null));
    if (moved > 0) await track({ name: "account_created", userId: me.id, props: { via: "guest_claim", plans: moved, app: true } });
  } catch (e) {
    console.error("[api claim guests]", e);
  }

  return apiJson({ ...(await listed(await store.listPlansForUser(me.id))), claimed });
}

async function listed(rows: Awaited<ReturnType<typeof store.listPlansForUser>>) {
  const plans: MyPlan[] = await Promise.all(
    rows.map(async ({ plan, member }) => toMyPlan(plan, await store.listMembers(plan.id), member, formatShort(plan.starts_at)))
  );
  const upcoming = (p: MyPlan) => (p.status === "voting" || p.status === "locked") && (!p.starts_at || Date.parse(p.starts_at) > Date.now() - SIX_HOURS);
  const soonest = (a: MyPlan, b: MyPlan) => (a.starts_at ? Date.parse(a.starts_at) : Infinity) - (b.starts_at ? Date.parse(b.starts_at) : Infinity);
  const next = plans.filter(upcoming).sort(soonest);
  const past = plans.filter((p) => !upcoming(p)).sort((a, b) => soonest(b, a)).slice(0, 5);
  return { upcoming: next, past };
}
