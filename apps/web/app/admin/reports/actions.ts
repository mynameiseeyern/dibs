"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-access";
import { store } from "@/lib/store";

async function gate() {
  if (!(await isAdmin())) throw new Error("Not allowed");
}

/** Takes down what was reported. For a plan, that's calling it off. */
async function takeDown(id: string) {
  const r = await store.getReport(id);
  if (!r?.plan_id) return r;
  if (r.kind === "message" && r.target_id) await store.deleteMessage(r.plan_id, r.target_id);
  if (r.kind === "photo" && r.target_id) await store.removePhoto(r.plan_id, r.target_id);
  if (r.kind === "plan") await store.updatePlan(r.plan_id, { status: "cancelled" });
  return r;
}

export async function removeContent(id: string) {
  await gate();
  await takeDown(id);
  await store.resolveReport(id, "actioned");
  revalidatePath("/admin/reports");
}

/** Content gone and the person off the service: Apple's "removing the content and ejecting the user". */
export async function removeAndBan(id: string) {
  await gate();
  const r = await takeDown(id);
  if (r?.target_person) {
    await store.addBan(r.target_person, null);
    if (r.plan_id) {
      const members = await store.listMembers(r.plan_id);
      const them = members.find((m) => (r.target_person === `u:${m.user_id}` || r.target_person === `g:${m.guest_id}`) && m.role !== "organiser");
      if (them) {
        await store.deleteMessagesBy(them.id);
        await store.ejectMember(them.id);
      }
    }
  }
  await store.resolveReport(id, "actioned");
  revalidatePath("/admin/reports");
}

export async function dismiss(id: string) {
  await gate();
  await store.resolveReport(id, "dismissed");
  revalidatePath("/admin/reports");
}
