import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { crews } from "@/lib/crews";
import { loadPlan } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/**
 * `PUT { visibility: "crew" | "link" }`: who can see a crew plan (ARV-93). Hosts only, crew plans only.
 * "link" lets anyone with it in, guests included; "crew" puts it back to the crew alone.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await readBody(req);
  if (body.visibility !== "crew" && body.visibility !== "link") return apiError("Pick crew only or anyone with the link.", 400);
  const visibility = body.visibility;
  type Out = { ok: false; error: string; status: number } | { ok: true; detail: Awaited<ReturnType<typeof planDetail>> };
  const out = await forApp(req, async (): Promise<Out> => {
    const view = await loadPlan(slug);
    if (!view) return { ok: false, error: "This plan doesn't exist any more.", status: 404 };
    if (!view.isHost) return { ok: false, error: "Only the hosts can change who sees this.", status: 403 };
    const { crewId } = await crews.planCrew(view.plan);
    if (!crewId) return { ok: false, error: "Only crew plans can be crew only.", status: 400 };
    await crews.setPlanCrew(view.plan.id, { crewId, visibility });
    return { ok: true, detail: await planDetail(slug) };
  });
  if (!out.ok) return apiError(out.error, out.status);
  return out.detail ? apiJson(out.detail) : apiError("This plan doesn't exist any more.", 404);
}
