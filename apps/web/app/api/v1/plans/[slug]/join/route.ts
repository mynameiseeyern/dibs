import { apiError, apiGuest, apiJson, apiOrganiser, newApiGuest, readBody, text } from "@/lib/api-auth";
import { planDetail } from "@/lib/api-plan";
import { asViewer } from "@/lib/api-viewer";
import { joinPlan } from "@/app/p/[slug]/actions";

export const dynamic = "force-dynamic";

/**
 * `POST { rsvp: "in" | "maybe", first?, last? }`: join from the link, the web's `joinPlan`.
 * No account and no guest pass: send a first name (last optional) and get a pass back.
 * → `{ detail, guest_token? }`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await readBody(req);
  const rsvp = body.rsvp === "maybe" ? "maybe" : "in";
  const organiser = await apiOrganiser(req);
  let guest = organiser ? null : await apiGuest(req);
  let guestToken: string | undefined;

  if (!organiser && !guest) {
    const first = text(body.first, 40);
    if (!first) return apiJson({ error: "Pop in your name so the crew knows who you are.", field: "first" }, 400);
    const made = await newApiGuest(first, text(body.last, 40));
    guest = made.guest;
    guestToken = made.token;
  }

  return asViewer({ organiser, guest }, async () => {
    const form = new FormData();
    form.set("rsvp", rsvp);
    form.set("first_name", text(body.first, 40));
    form.set("last_name", text(body.last, 40));
    const res = await joinPlan(slug, undefined, form);
    if (res?.error) return apiError(res.error, 400);
    const detail = await planDetail(slug);
    return detail ? apiJson({ detail, ...(guestToken ? { guest_token: guestToken } : {}) }) : apiError("This plan doesn't exist any more.", 404);
  });
}
