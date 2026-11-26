import { cleanCrew, type CrewSummary } from "@dibs/shared/crews";
import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { crewSuggestionFor } from "@/lib/crew-plans";
import { crews } from "@/lib/crews";
import { pushToUsers } from "@/lib/push";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/**
 * `POST { name, emoji }`: "Turn this into a crew?" (ARV-96). Makes the crew with you as owner, puts
 * this plan in it (anyone with the link, so no one on it loses it before they join), and sends
 * each suggested person a personal invite: one use, theirs only, straight in with no approval.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await readBody(req);
  const clean = cleanCrew(body.name, body.emoji);
  if (!clean) return apiError(String(body.name ?? "").trim() ? "Pick one emoji for your crew." : "Give your crew a name.", 400);

  type Out = { ok: false; error: string; status: number } | { ok: true; crew: CrewSummary; invited: number; detail: Awaited<ReturnType<typeof planDetail>> };
  const out = await forApp(req, async (): Promise<Out> => {
    const view = await loadPlan(slug);
    if (!view) return { ok: false, error: "This plan doesn't exist any more.", status: 404 };
    if (!view.isHost || !view.organiser) return { ok: false, error: "Only the hosts can do that, signed in.", status: 403 };
    const me = view.organiser;
    const suggestion = await crewSuggestionFor(view.plan, view.members, me.id, view.isHost);
    if (!suggestion) return { ok: false, error: "There's no crew to make from this plan.", status: 409 };

    const crew = await crews.createCrew(me.id, clean);
    await crews.setPlanCrew(view.plan.id, { crewId: crew.id, visibility: "link" });
    const first = view.me?.display_name.split(" ")[0] ?? "Someone";
    let invited = 0;
    for (const p of suggestion.people) {
      try {
        const link = await crews.createInvite({ crewId: crew.id, userId: me.id, role: "owner", expiry: "7d", maxUses: 1, forUser: p.user_id });
        pushToUsers(store, [p.user_id], { title: `${crew.emoji} ${crew.name}`, body: `${first} made a crew for you lot. Tap to join.`, url: new URL(link.url).pathname });
        invited += 1;
      } catch (e) {
        console.error("[api crews] personal invite", crew.id, e);
      }
    }
    return { ok: true, crew, invited, detail: await planDetail(slug) };
  });
  if (!out.ok) return apiError(out.error, out.status);
  return apiJson({ crew: out.crew, invited: out.invited, detail: out.detail }, 201);
}
