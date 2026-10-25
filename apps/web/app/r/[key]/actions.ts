"use server";

import { redirect } from "next/navigation";
import { FORMER_MEMBER } from "@dibs/shared/plans";
import { createGuestSession, currentGuest, resumeGuestSession } from "@/lib/guest";
import { guestKeyOk, memberKeyOk, parseRejoinKey } from "@/lib/rejoin";
import { store } from "@/lib/store";

export type RejoinState = { error?: string } | undefined;

const GONE = "This link doesn't work any more. Ask whoever made the plan to send you a new one.";

/** "That's me": puts this browser back on the spot the link is for. A tap, never the page load, so link previews can't use it up. */
export async function rejoin(raw: string, _prev: RejoinState): Promise<RejoinState> {
  const key = parseRejoinKey(raw);
  if (!key) return { error: GONE };

  if (key.kind === "g") {
    if (!guestKeyOk(key) || !(await store.getGuest(key.id))) return { error: GONE };
    await resumeGuestSession(key.id);
    redirect("/home");
  }

  const member = await store.getMember(key.id);
  if (!member || !memberKeyOk(key, member) || member.user_id) return { error: GONE };
  const plan = await store.getPlanById(member.plan_id);
  if (!plan) return { error: GONE };

  // This browser's guest, or a new one with the name the host knows them by.
  let guest = await currentGuest();
  if (guest?.id === member.guest_id) redirect(`/p/${plan.slug}`);
  if (!guest) {
    const [first, ...rest] = member.display_name.split(" ");
    guest = await createGuestSession(first, rest.join(" "));
  }

  // They rejoined as someone new on this browser: retire that extra spot, unless it's on a bill.
  const members = await store.listMembers(plan.id);
  const extra = members.find((m) => m.guest_id === guest!.id);
  if (extra) {
    const [bills, shares] = await Promise.all([store.listBills(plan.id), store.listShares(plan.id)]);
    if (bills.some((b) => b.payer_member_id === extra.id) || shares.some((s) => s.member_id === extra.id)) {
      return { error: `You're on a bill as ${extra.display_name} on this browser, so we can't swap you over. Ask the organiser to sort it.` };
    }
    await store.setMemberGuest(extra.id, null);
    await store.updateMember(extra.id, { rsvp: "out", display_name: FORMER_MEMBER });
  }
  await store.setMemberGuest(member.id, guest.id);
  redirect(`/p/${plan.slug}`);
}
