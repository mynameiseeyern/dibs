import { toMyPlan, type MyPlan } from "@dibs/shared/api";
import { apiError, apiGuest, apiJson, apiOrganiser } from "@/lib/api-auth";
import { track } from "@/lib/events";
import { personKey } from "@dibs/shared/moderation";
import { screenFor } from "@/lib/moderation";
import { store } from "@/lib/store";
import { formatShort } from "@/lib/time";
import { formatAud } from "@dibs/shared/bills";
import { countIn, wrapState } from "@dibs/shared/plans";
import { owedToYou, youOwe } from "@/lib/copy";
import { planStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

const SIX_HOURS = 6 * 3600 * 1000;

/**
 * The phone's home screen: the web's /home groups (Up next, To sort out, Been and done).
 * Works for a guest pass too. Signed in with the guest pass still on the phone, its plans move onto
 * the account (`claimed`), so the app can drop the pass.
 */
export async function GET(req: Request) {
  const me = await apiOrganiser(req);
  const guest = await apiGuest(req);
  if (!me) {
    if (!guest) return apiError("Sign in again.", 401);
    return apiJson(await listed(await store.listPlansForGuest(guest.id), `g:${guest.id}`));
  }

  // Plans made or joined as a guest (on this phone, or with this email) come across, like signing in on the web.
  let claimed = 0;
  try {
    const moved = (claimed = await store.claimGuests(me.id, me.email, guest?.id ?? null));
    if (moved > 0) await track({ name: "account_created", userId: me.id, props: { via: "guest_claim", plans: moved, app: true } });
  } catch (e) {
    console.error("[api claim guests]", e);
  }

  return apiJson({ ...(await listed(await store.listPlansForUser(me.id), `u:${me.id}`)), claimed });
}

/**
 * The same three groups as the web's home (app/home/page.tsx): Up next, To sort out, Been and done,
 * in the same order, with the same status chip, row label, faces and nudge.
 */
async function listed(rows: Awaited<ReturnType<typeof store.listPlansForUser>>, viewer: string) {
  // Reported plans, and plans hosted by someone you've blocked, stay off your list.
  const screen = await screenFor(viewer);
  const hidden = (plan: { id: string }, members: { role: string; user_id: string | null; guest_id: string | null }[]) => {
    const host = members.find((m) => m.role === "organiser");
    return screen.reported.has(plan.id) || (host ? screen.blocked.has(personKey(host) ?? "") : false);
  };
  const all = await Promise.all(
    rows.map(async ({ plan, member }) => {
      const [members, bills, shares] = await Promise.all([store.listMembers(plan.id), store.listBills(plan.id), store.listShares(plan.id)]);
      if (hidden(plan, members)) return null;
      const payerOf = new Map(bills.map((b) => [b.id, b.payer_member_id]));
      const open = shares.filter((x) => x.status !== "confirmed" && x.amount_cents > 0 && x.member_id !== payerOf.get(x.bill_id));
      const iOwe = open.filter((x) => x.member_id === member.id).reduce((n, x) => n + x.amount_cents, 0);
      const owedToMe = open.filter((x) => payerOf.get(x.bill_id) === member.id).reduce((n, x) => n + x.amount_cents, 0);
      const hosting = member.role === "organiser" || member.role === "cohost";
      const nudge =
        iOwe > 0
          ? youOwe(plan.vibe, formatAud(iOwe))
          : owedToMe > 0
            ? owedToYou(plan.vibe, formatAud(owedToMe))
            : hosting && wrapState(plan) === "ready"
              ? "Wrap it up: who came?"
              : !member.rsvp && plan.status !== "cancelled" && plan.status !== "wrapped"
                ? "You haven't said if you're in"
                : null;
      const row: MyPlan = {
        ...toMyPlan(plan, members, member, formatShort(plan.starts_at)),
        // The row's count is the web's: people in, plus-ones included.
        going: countIn(members),
        role_label: member.role === "organiser" ? "Hosting" : member.role === "cohost" ? "Co-hosting" : "Going",
        status_label: planStatus(plan).label,
        faces: members.filter((m) => m.rsvp === "in" && !m.waitlisted).map((m) => ({ name: m.display_name, colour: m.colour })),
        nudge,
      };
      return { row, money: iOwe > 0 || owedToMe > 0, wrap: hosting && wrapState(plan) === "ready" };
    })
  );
  const plans = all.filter((p): p is NonNullable<typeof p> => p !== null);
  const upcoming = (p: MyPlan) => (p.status === "voting" || p.status === "locked") && (!p.starts_at || Date.parse(p.starts_at) > Date.now() - SIX_HOURS);
  const next = plans.filter((p) => upcoming(p.row));
  const sortOut = plans.filter((p) => !upcoming(p.row) && (p.money || p.wrap));
  const past = plans.filter((p) => !next.includes(p) && !sortOut.includes(p)).reverse().slice(0, 5);
  return { upcoming: next.map((p) => p.row), sort_out: sortOut.map((p) => p.row), past: past.map((p) => p.row) };
}
