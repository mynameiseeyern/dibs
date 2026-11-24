import { apiError, apiJson } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { lockPlan } from "@/app/p/[slug]/actions";

export const dynamic = "force-dynamic";

/** `POST`: a host closes the vote now and locks in the leader (the web's Lock it in). → `PlanDetail`. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return forApp(req, async () => {
    const before = await planDetail(slug);
    if (!before) return apiError("This plan doesn't exist any more.", 404);
    if (!before.me?.host) return apiError("Only hosts can lock it in.", 403);
    await lockPlan(slug);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
