import { crewPermissions, type PlanVisibility } from "@dibs/shared/crews";
import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { crews } from "@/lib/crews";
import { pushToUsers } from "@/lib/push";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/**
 * `POST { crew_id: string | null }`: put a plan you host into one of your crews, or take it out (ARV-95).
 *
 * In: crew only if everyone on it is in the crew. Otherwise anyone with the link, so no one already
 * on it loses their spot (`moved.visibility` says which, for the app to tell you).
 * Out: back to an ordinary plan, anyone with the link.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await readBody(req);
  const crewId = typeof body.crew_id === "string" && body.crew_id ? body.crew_id : null;
  if (body.crew_id !== null && !crewId) return apiError("Pick a crew.", 400);

  type Out = { ok: false; error: string; status: number } | { ok: true; visibility: PlanVisibility | null; detail: Awaited<ReturnType<typeof planDetail>> };
  const out = await forApp(req, async (): Promise<Out> => {
    const r = await move();
    return r.ok ? { ...r, detail: await planDetail(slug) } : r;
  });
  if (!out.ok) return apiError(out.error, out.status);
  return out.detail ? apiJson({ detail: out.detail, moved: { visibility: out.visibility } }) : apiError("This plan doesn't exist any more.", 404);

  async function move(): Promise<{ ok: false; error: string; status: number } | { ok: true; visibility: PlanVisibility | null }> {
    const view = await loadPlan(slug);
    if (!view) return { ok: false, error: "This plan doesn't exist any more.", status: 404 };
    if (!view.isHost || !view.organiser) return { ok: false, error: "Only the hosts can do that, signed in.", status: 403 };
    const current = await crews.planCrew(view.plan);

    if (!crewId) {
      if (current.crewId) await crews.setPlanCrew(view.plan.id, { crewId: null, visibility: "link" });
      return { ok: true, visibility: null };
    }
    if (current.crewId === crewId) return { ok: true, visibility: current.visibility };
    if (current.crewId) return { ok: false, error: "Take it out of its crew first.", status: 409 };

    const role = await crews.roleIn(crewId, view.organiser.id);
    const crew = crewPermissions(role).makePlan ? await crews.getCrew(crewId) : null;
    if (!crew) return { ok: false, error: "Couldn't find that crew.", status: 404 };

    // Everyone on it in the crew? Then crew only. Anyone else (guests, mates outside it) keeps their spot by link.
    const inCrew = new Set((await crews.listMembers(crewId)).map((m) => m.user_id));
    const outsiders = view.members.some((m) => !m.user_id || !inCrew.has(m.user_id));
    const visibility: PlanVisibility = outsiders ? "link" : "crew";
    await crews.setPlanCrew(view.plan.id, { crewId, visibility });

    const others = (await crews.listMembers(crewId)).filter((m) => m.user_id !== view.organiser!.id && !m.muted).map((m) => m.user_id);
    const first = view.me?.display_name.split(" ")[0] ?? "Someone";
    pushToUsers(store, others, { title: `${crew.emoji} ${crew.name}`, body: `${first} added a plan: ${view.plan.title}`, url: `/p/${view.plan.slug}` });
    return { ok: true, visibility };
  }
}
