import { NextResponse } from "next/server";
import { toPlanSummary } from "@dibs/shared/api";
import { apiOrganiser } from "@/lib/api-auth";
import { crewGate } from "@/lib/crew-plans";
import { store } from "@/lib/store";
import { formatShort } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * A plan link, read by the native app. Public like the link preview: anyone holding the link
 * sees the same facts (`PlanSummary` says which). Joining, voting and chat go through their own
 * endpoints once the app has sign-in.
 *
 * Used by apps/mobile (lib/api.ts). Shape lives in @dibs/shared/api: add fields, never rename.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await store.getPlanBySlug(slug);
  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  const members = await store.listMembers(plan.id);
  // Crew-only plans: the same 404 as a wrong link for anyone outside the crew.
  const me = await apiOrganiser(req);
  const onPlan = Boolean(me && members.some((m) => m.user_id === me.id));
  if (!(await crewGate(plan, { userId: me?.id ?? null, onPlan })).see) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  return NextResponse.json(toPlanSummary(plan, members, formatShort(plan.starts_at)), { headers: { "Cache-Control": "no-store" } });
}
