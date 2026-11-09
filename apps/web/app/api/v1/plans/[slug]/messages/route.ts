import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { postMessage } from "@/app/p/[slug]/actions";
import { loadPlan } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/**
 * `POST { body }`: a message in the plan's chat, the web's `postMessage` (tag @dibby and Dibby
 * replies, which takes a few seconds). Guests read along; an account posts. → `PlanDetail`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await readBody(req)).body;
  if (typeof body !== "string" || !body.trim()) return apiError("Type something first.", 400);
  return forApp(req, async () => {
    // The web tells guests to get the app; in the app, it's adding an email.
    const view = await loadPlan(slug);
    if (view?.me && !view.me.user_id) return apiError("Add your email to chat. One code, no password.", 403);
    const form = new FormData();
    form.set("body", body.slice(0, 2000));
    const res = await postMessage(slug, undefined, form);
    if (res?.error) return apiError(res.error, 403);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
