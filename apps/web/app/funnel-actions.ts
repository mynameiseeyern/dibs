"use server";

import { currentOrganiser } from "@/lib/auth";
import { track } from "@/lib/events";
import { store } from "@/lib/store";

/** The random ID `LinkOpened` keeps in this browser: 22 URL-safe characters, nothing else. */
const ANON = /^[A-Za-z0-9_-]{22}$/;

/**
 * Someone who isn't on the plan opened its link. Counted per browser per plan by `anon`, a
 * random ID with nothing behind it. Never throws.
 */
export async function trackLinkOpened(slug: string, anon: string): Promise<void> {
  if (!ANON.test(anon)) return;
  try {
    const [plan, organiser] = await Promise.all([store.getPlanBySlug(slug), currentOrganiser()]);
    if (!plan) return;
    await track({ name: "plan_link_opened", planId: plan.id, props: { anon, signed_in: Boolean(organiser) } });
  } catch (e) {
    console.warn("[link opened]", e);
  }
}
