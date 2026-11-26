import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { addOption } from "@/app/p/[slug]/actions";

export const dynamic = "force-dynamic";

/**
 * `POST { place_id }` (a business picked from `GET /api/v1/places`) or `POST { name, address? }`
 * (typed in): add a place to the vote, the web's `addOption` (up to 8, no doubles). → `PlanDetail`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await readBody(req);
  return forApp(req, async () => {
    const form = new FormData();
    if (typeof body.place_id === "string" && body.place_id) form.set("place_id", body.place_id);
    else {
      form.set("custom_name", typeof body.name === "string" ? body.name : "");
      form.set("custom_address", typeof body.address === "string" ? body.address : "");
    }
    const res = await addOption(slug, undefined, form);
    if (res?.error) return apiError(res.error, 400);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
