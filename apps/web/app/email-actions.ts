"use server";

import { revalidatePath } from "next/cache";
import { BETA_LIST } from "@dibs/email";
import { currentOrganiser } from "@/lib/auth";
import { store } from "@/lib/store";

export type ListState = { subscribed: boolean; error?: string } | undefined;

/** The toggle on /account. Needs a signed-in account with an email. */
export async function setBetaUpdates(_prev: ListState, form: FormData): Promise<ListState> {
  const me = await currentOrganiser();
  if (!me) return { subscribed: false, error: "Sign in to change your email settings." };
  const on = form.get("beta_updates") === "on";
  try {
    if (on) {
      if (!me.email) return { subscribed: false, error: "Your account doesn't have an email to send to." };
      await store.subscribe(BETA_LIST, { email: me.email, userId: me.id, source: "account" });
    } else {
      await store.unsubscribe(BETA_LIST, { userId: me.id });
    }
  } catch (e) {
    console.error("[email settings]", me.id, e);
    return { subscribed: !on, error: "Couldn't save that. Try again in a sec." };
  }
  await store.answerBetaPrompt(me.id).catch(() => {});
  revalidatePath("/account");
  return { subscribed: on };
}

/** The one-time card on Your plans. Either answer saves, and the card never shows again. */
export async function answerBetaCard(form: FormData): Promise<void> {
  const me = await currentOrganiser();
  if (!me) return;
  try {
    if (form.get("answer") === "yes" && me.email) {
      await store.subscribe(BETA_LIST, { email: me.email, userId: me.id, source: "home-card" });
    }
    await store.answerBetaPrompt(me.id);
  } catch (e) {
    console.error("[beta card]", me.id, e);
  }
  revalidatePath("/home");
}

/** The button on /unsubscribe. The token in the email is the only thing needed, no sign-in. */
export async function unsubscribeWithToken(_prev: ListState, form: FormData): Promise<ListState> {
  const token = String(form.get("t") ?? "");
  const sub = token ? await store.unsubscribe(BETA_LIST, { token }) : null;
  if (!sub) return { subscribed: false, error: "That link doesn't work anymore. Email us and we'll take you off." };
  return { subscribed: false };
}

/** "Changed your mind?" on /unsubscribe. */
export async function resubscribeWithToken(_prev: ListState, form: FormData): Promise<ListState> {
  const token = String(form.get("t") ?? "");
  const sub = token ? await store.getSubscription(BETA_LIST, { token }) : null;
  if (!sub) return { subscribed: false, error: "That link doesn't work anymore." };
  await store.subscribe(BETA_LIST, { email: sub.email, userId: null, source: "resubscribe" });
  return { subscribed: true };
}
