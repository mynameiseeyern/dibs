"use server";

import { FILTERED_NOTE, isFiltered } from "@dibs/shared/moderation";
import { revalidatePath } from "next/cache";
import { extraOn } from "@dibs/shared/plans";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";

export type FormState = { error?: string; saved?: boolean } | undefined;

/** One recap per person who came: stars, best moment, MVP. Saving again updates it. */
export async function saveRecap(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.me?.attended) return { error: "The recap is just for people who came." };
  if (!extraOn(view.plan, "recap")) return { error: "The recap's switched off for this plan." };
  const starsRaw = Number(form.get("stars"));
  const stars = Number.isInteger(starsRaw) && starsRaw >= 1 && starsRaw <= 5 ? starsRaw : null;
  const best = String(form.get("best_moment") ?? "").replace(/\s+/g, " ").trim().slice(0, 280) || null;
  if (isFiltered(best)) return { error: FILTERED_NOTE };
  const mvpId = String(form.get("mvp") ?? "");
  const mvp = view.members.some((m) => m.id === mvpId && m.attended && m.id !== view.me!.id) ? mvpId : null;
  if (!stars && !best && !mvp) return { error: "Answer at least one, even just the stars." };
  await store.saveRecap({ plan_id: view.plan.id, member_id: view.me.id, stars, best_moment: best, mvp_member_id: mvp });
  revalidatePath(`/p/${slug}/recap`);
  return { saved: true };
}
