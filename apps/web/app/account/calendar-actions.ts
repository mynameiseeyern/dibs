"use server";

import { revalidatePath } from "next/cache";
import { currentOrganiser } from "@/lib/auth";
import { store } from "@/lib/store";

/** A new calendar link. The old one stops working, so any calendar using it stops updating. */
export async function resetCalendarLink(): Promise<{ error?: string }> {
  const me = await currentOrganiser();
  if (!me) return { error: "Sign in to manage your calendar link." };
  await store.calendarFeedToken(me.id, { reset: true });
  revalidatePath("/account");
  return {};
}
