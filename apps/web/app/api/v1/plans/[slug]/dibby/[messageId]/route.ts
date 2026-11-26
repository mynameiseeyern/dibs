import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { answerDibbyPlan, undoDibbyPlaces } from "@/app/p/[slug]/dibby-actions";

export const dynamic = "force-dynamic";

/**
 * `POST { action: "make" | "skip" | "undo" }` on one of Dibby's messages (ARV-59): set up the
 * new plan it drafted, or skip it (only whoever asked), or take its places back off the vote
 * (them or a host). The web's dibby-actions, with the same checks. → `PlanDetail`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; messageId: string }> }) {
  const { slug, messageId } = await params;
  const action = (await readBody(req)).action;
  if (action !== "make" && action !== "skip" && action !== "undo") return apiError("Pick make, skip or undo.", 400);
  return forApp(req, async () => {
    const res = action === "undo" ? await undoDibbyPlaces(slug, messageId) : await answerDibbyPlan(slug, messageId, action === "make");
    if (res.error) return apiError(res.error, 403);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
