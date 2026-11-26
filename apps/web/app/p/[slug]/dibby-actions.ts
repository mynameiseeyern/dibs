"use server";

import { revalidatePath } from "next/cache";
import { planAccess } from "@dibs/shared/plans";
import { byOf, canUndo, pendingOf, setCard, undoneOf } from "@/lib/dibby-card";
import { makeDrafted } from "@/lib/dibby-plan";
import { placesOf } from "@/lib/place-ids";
import { report } from "@/lib/report";
import { store } from "@/lib/store";
import { planLinkLine } from "@/lib/thread-links";
import { loadPlan } from "@/lib/viewer";

// Dibby's confirm card and Undo (ARV-59). Both check who's asking here, on the server: the
// card is only for whoever asked Dibby, Undo is for them or a host.

const TRY_AGAIN = "Couldn't do that just then. Try again in a sec.";

function revalidate(slug: string) {
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/chat`);
}

async function dibbyMessage(slug: string, messageId: string) {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan first." } as const;
  const msg = (await store.listMessages(view.plan.id, 200)).find((m) => m.id === messageId && m.kind === "dibby");
  if (!msg) return { error: "That message has gone." } as const;
  return { view, msg } as const;
}

/**
 * The asker's answer to "Set up a new plan?": `make` creates it and invites everyone from this
 * plan; `skip` drops the draft. Either way the card goes. → the new plan's slug when made.
 */
export async function answerDibbyPlan(slug: string, messageId: string, make: boolean): Promise<{ error?: string; slug?: string }> {
  const got = await dibbyMessage(slug, messageId);
  if ("error" in got) return { error: got.error };
  const { view, msg } = got;
  const me = view.me!;
  const draft = pendingOf(msg.template);
  if (!draft) return { error: "That's already been sorted." };
  if (byOf(msg.template) !== me.id || !me.user_id) return { error: "Only the person who asked Dibby can set this up." };
  if (make && planAccess(me).level !== "full") return { error: "You need to be going to set up a plan from here." };

  // Claim the card first, so a double tap (or the web and the phone at once) makes one plan.
  const claimed = await store.updateMessage(view.plan.id, msg.id, { template: setCard(msg.template, { plan_state: make ? "making" : "declined" }) }, "plan_state");
  if (!claimed) return { error: "That's already been sorted." };
  if (!make) {
    revalidate(slug);
    return {};
  }
  try {
    const made = await makeDrafted(draft, me, view.members, draft.ask);
    await store.updateMessage(view.plan.id, msg.id, { body: `${msg.body}\n${planLinkLine(made.slug)}`, template: setCard(msg.template, { plan_state: "made", pending_plan: null }) });
    revalidate(slug);
    return { slug: made.slug };
  } catch (e) {
    report("dibby-plan", e);
    // Put the card back so they can try again.
    await store.updateMessage(view.plan.id, msg.id, { template: msg.template });
    revalidate(slug);
    return { error: TRY_AGAIN };
  }
}

/**
 * Take the places Dibby added in this reply back off the vote. Only places Dibby added (not
 * ones a person added since), and only while the vote's open. Votes on them go too.
 */
export async function undoDibbyPlaces(slug: string, messageId: string): Promise<{ error?: string; removed?: number }> {
  const got = await dibbyMessage(slug, messageId);
  if ("error" in got) return { error: got.error };
  const { view, msg } = got;
  if (!canUndo(msg.template, view.me, view.isHost)) return { error: "Only whoever asked Dibby, or a host, can undo this." };
  if (view.plan.status !== "voting") return { error: "Voting's closed, so these stay." };
  if (undoneOf(msg.template)) return { removed: 0 };
  const ids = new Set(placesOf(msg.template));
  const options = (await store.listOptions(view.plan.id)).filter((o) => o.place_id && ids.has(o.place_id) && !o.added_by);
  for (const o of options) await store.removeOption(view.plan.id, o.id);
  await store.updateMessage(view.plan.id, msg.id, { template: setCard(msg.template, { undone: true }) });
  if (options.length) {
    const who = view.me!.display_name.split(" ")[0];
    const what = options.length === 1 ? options[0].label : `${options.length} places`;
    await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${who} took ${what} from Dibby off the vote.` });
  }
  revalidate(slug);
  return { removed: options.length };
}
