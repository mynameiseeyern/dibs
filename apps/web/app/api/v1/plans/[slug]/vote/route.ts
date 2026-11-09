import { apiError, apiJson, readBody, text } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { vote } from "@/app/p/[slug]/actions";

export const dynamic = "force-dynamic";

/** `POST { option_id }`: a tap on a place, the web's `vote` (picks, swaps, the limit). → `PlanDetail`. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const optionId = text((await readBody(req)).option_id, 64);
  if (!optionId) return apiError("Pick a place.", 400);
  return forApp(req, async () => {
    const res = await vote(slug, optionId);
    if (res.error) return apiError(res.error, 403);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
