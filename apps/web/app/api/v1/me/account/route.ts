import type { AccountInfo } from "@dibs/shared/api";
import { BETA_LIST } from "@dibs/email";
import { formatAud, rouletteTally } from "@dibs/shared/bills";
import { apiError, apiGuest, apiJson, apiOrganiser, readBody } from "@/lib/api-auth";
import { feedPath } from "@/lib/calendar";
import { siteUrl } from "@/lib/site";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** The phone's version of the web's /account page (app/account/page.tsx): who, wheel record, emails, calendar. */
export async function GET(req: Request) {
  const [organiser, guest] = await Promise.all([apiOrganiser(req), apiGuest(req)]);
  const profile = organiser ? await store.getProfile(organiser.id).catch(() => null) : null;
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : guest ? [guest.first_name, guest.last_name].filter(Boolean).join(" ") : null;
  // Both fail soft, like the web page, if their migrations haven't run.
  const beta = organiser ? await store.getSubscription(BETA_LIST, { userId: organiser.id }).catch(() => null) : null;
  const calendarToken = organiser ? await store.calendarFeedToken(organiser.id).catch(() => null) : null;

  // Every spun bill on every plan you're on, counted for your spot there (same as the web).
  const memberships = [...(organiser ? await store.listPlansForUser(organiser.id) : []), ...(guest && !organiser ? await store.listPlansForGuest(guest.id) : [])];
  const record = { played: 0, lost: 0, paidCents: 0 };
  for (const { plan, member } of memberships) {
    const bills = (await store.listBills(plan.id)).filter((b) => b.split_mode === "roulette" && b.roulette_loser_id);
    const mine = rouletteTally(bills).find((r) => r.memberId === member.id);
    if (mine) {
      record.played += mine.played;
      record.lost += mine.lost;
      record.paidCents += mine.paidCents;
    }
  }

  const body: AccountInfo = {
    kind: organiser ? "account" : guest ? "guest" : "none",
    name: name || null,
    email: organiser?.email ?? null,
    record: record.played > 0 ? { played: record.played, lost: record.lost, paid: formatAud(record.paidCents) } : null,
    beta_updates: organiser ? (beta?.subscribed ?? false) : null,
    calendar_url: calendarToken ? `${siteUrl()}${feedPath(calendarToken)}` : null,
  };
  return apiJson(body);
}

/** `PUT { beta_updates }`: the web's Beta updates switch (setBetaUpdates in email-actions.ts). → `AccountInfo`. */
export async function PUT(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in to change your email settings.", 401);
  const on = (await readBody(req)).beta_updates;
  if (typeof on !== "boolean") return apiError("On or off?", 400);
  try {
    if (on) {
      if (!me.email) return apiError("Your account doesn't have an email to send to.", 400);
      await store.subscribe(BETA_LIST, { email: me.email, userId: me.id, source: "account" });
    } else {
      await store.unsubscribe(BETA_LIST, { userId: me.id });
    }
  } catch (e) {
    console.error("[api email settings]", me.id, e);
    return apiError("Couldn't save that. Try again in a sec.", 500);
  }
  await store.answerBetaPrompt(me.id).catch(() => {});
  return GET(req);
}
