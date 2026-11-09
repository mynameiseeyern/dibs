import { NextResponse } from "next/server";
import { toPlanSummary } from "@dibs/shared/api";
import { personKey } from "@dibs/shared/moderation";
import { apiGuest, apiOrganiser } from "@/lib/api-auth";
import { screenFor } from "@/lib/moderation";
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
  // Blocked the organiser, or reported this plan: it's gone for you.
  const me = await apiOrganiser(req);
  const guest = me ? null : await apiGuest(req);
  const viewer = me ? `u:${me.id}` : guest ? `g:${guest.id}` : null;
  const screen = await screenFor(viewer);
  const host = members.find((m) => m.role === "organiser");
  if (screen.reported.has(plan.id) || (host && screen.blocked.has(personKey(host) ?? ""))) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  return NextResponse.json(toPlanSummary(plan, members, formatShort(plan.starts_at)), { headers: { "Cache-Control": "no-store" } });
}
