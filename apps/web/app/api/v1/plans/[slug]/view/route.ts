import { apiError, apiJson } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";

export const dynamic = "force-dynamic";

/** The plan as the app's person sees it: `PlanDetail`. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await forApp(req, () => planDetail(slug));
  return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
}
