import "server-only";
import { after } from "next/server";
import { extraOn, planAccess } from "@dibs/shared/plans";
import type { Message, PlanMember } from "@dibs/shared/types";
import { report } from "./report";
import type { Store } from "./store/types";

/**
 * Push notifications to the native app, sent through Expo's push service.
 *
 * Nearly everything that happens on a plan lands in its chat (people's messages, Dibby's nudges,
 * "A spot opened up", "Ee picked the place", "called off"), so a message is what sends a push:
 * `withPush` in lib/store/index.ts wraps `addMessage` and `addMember`. Who gets it follows the web's
 * rules: not the person who wrote it, not anyone who said they can't go, and Dibby's own nudges
 * skip people who muted them. Someone joining tells the hosts.
 *
 * EXPO_ACCESS_TOKEN: only if "enhanced push security" is turned on for the Expo project.
 */

// EXPO_PUSH_URL: point it at a local stand-in to see what would be sent (testing only).
const EXPO_PUSH = process.env.EXPO_PUSH_URL || "https://exp.host/--/api/v2/push/send";
const MAX_BODY = 178;

type Push = { to: string; title: string; body: string; data: { url: string }; sound: "default"; channelId: "default" };

/** After the response, so a tap never waits on Expo. Outside a request (a script), straight away. */
function later(fn: () => Promise<void>) {
  const run = () => fn().catch((e) => report("push", e));
  try {
    after(run);
  } catch {
    void run();
  }
}

const clip = (s: string) => (s.length > MAX_BODY ? `${s.slice(0, MAX_BODY - 1)}…` : s);
const first = (m: PlanMember | undefined) => m?.display_name.split(" ")[0] ?? "Someone";

/** A new message on a plan: everyone who can see the chat, but not its author. */
export function pushForMessage(store: Store, m: Message) {
  later(async () => {
    const plan = await store.getPlanById(m.plan_id);
    if (!plan || plan.status === "wrapped") return;
    // People's messages need the chat on; Dibby and system notes are plan news either way.
    if (m.kind === "text" && !extraOn(plan, "chat")) return;
    const members = await store.listMembers(plan.id);
    const author = members.find((x) => x.id === m.member_id);
    const to = members.filter((x) => x.id !== m.member_id && planAccess(x).level !== "hidden" && !(m.auto && x.dibby_muted));
    const body = m.kind === "text" ? `${first(author)}: ${m.body}` : m.kind === "dibby" ? `Dibby: ${m.body}` : m.body;
    await send(store, to, { title: plan.title, body: clip(body.replace(/\s+/g, " ").trim()), url: m.kind === "system" ? `/p/${plan.slug}` : `/p/${plan.slug}/chat` });
  });
}

/** Someone joined a plan from its link: tell the hosts. */
export function pushForJoin(store: Store, joined: PlanMember) {
  if (joined.role !== "guest") return;
  later(async () => {
    const plan = await store.getPlanById(joined.plan_id);
    if (!plan || plan.status === "cancelled" || plan.status === "wrapped") return;
    const hosts = (await store.listMembers(plan.id)).filter((x) => (x.role === "organiser" || x.role === "cohost") && x.id !== joined.id);
    await send(store, hosts, { title: plan.title, body: `${first(joined)} joined the plan`, url: `/p/${plan.slug}` });
  });
}

/** Straight to accounts, for things that aren't on a plan (crews: a join request, a yes or no). */
export function pushToUsers(store: Store, userIds: string[], msg: { title: string; body: string; url: string }) {
  later(() => sendTo(store, [...new Set(userIds)], [], { ...msg, body: clip(msg.body) }));
}

async function send(store: Store, to: PlanMember[], msg: { title: string; body: string; url: string }) {
  const userIds = [...new Set(to.map((x) => x.user_id).filter((x): x is string => Boolean(x)))];
  const guestIds = [...new Set(to.filter((x) => !x.user_id).map((x) => x.guest_id).filter((x): x is string => Boolean(x)))];
  await sendTo(store, userIds, guestIds, msg);
}

async function sendTo(store: Store, userIds: string[], guestIds: string[], msg: { title: string; body: string; url: string }) {
  if (!userIds.length && !guestIds.length) return;
  const tokens = await store.listPushTokens({ userIds, guestIds });
  if (!tokens.length) return;
  const pushes: Push[] = tokens.map((t) => ({ to: t.token, title: msg.title, body: msg.body, data: { url: msg.url }, sound: "default", channelId: "default" }));

  // Expo takes up to 100 at a time.
  for (let i = 0; i < pushes.length; i += 100) {
    const batch = pushes.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Expo push ${res.status}: ${(await res.text()).slice(0, 200)}`);
    // A phone that deleted the app: forget its token so we stop sending to it.
    const { data } = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
    await Promise.all(
      (data ?? []).map((ticket, n) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? store.removePushToken(batch[n].to) : null))
    );
  }
}
