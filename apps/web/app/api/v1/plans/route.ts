import { apiError, apiGuest, apiJson, apiOrganiser, newApiGuest, readBody, text } from "@/lib/api-auth";
import { checkNewPlan, makePlan, readNewPlan, type Host } from "@/lib/api-create-plan";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * `POST /api/v1/plans`: make a plan from the phone, no account needed. Like checking out as a
 * guest: signed in, it's yours; holding a guest pass, it's that guest's; otherwise send
 * `first` and `last` and you get a new guest pass back as `guest_token` (keep it in the keychain).
 * → `{ slug, guest_token? }`, or `{ error, field }`.
 */
export async function POST(req: Request) {
  const body = await readBody(req);
  const input = readNewPlan(body);
  const problem = checkNewPlan(input);
  if (problem) return apiJson(problem, 400);

  let host: Host;
  let guestToken: string | undefined;
  const me = await apiOrganiser(req);
  if (me) {
    const profile = await store.getProfile(me.id).catch(() => null);
    if (!profile) return apiJson({ error: "Add your name first.", field: "first" }, 400);
    host = { organiserName: `${profile.first_name} ${profile.last_name}`, organiserUserId: me.id, organiserGuestId: null };
  } else {
    const guest = await apiGuest(req);
    if (guest) host = { organiserName: `${guest.first_name} ${guest.last_name}`, organiserUserId: null, organiserGuestId: guest.id };
    else {
      const first = text(body.first, 40);
      const last = text(body.last, 40);
      if (!first) return apiJson({ error: "Add your first name.", field: "first" }, 400);
      if (!last) return apiJson({ error: "Add your last name.", field: "last" }, 400);
      const made = await newApiGuest(first, last);
      guestToken = made.token;
      host = { organiserName: `${first} ${last}`, organiserUserId: null, organiserGuestId: made.guest.id };
    }
  }

  try {
    const made = await makePlan(input, host);
    if ("error" in made) return apiJson(made, 502);
    return apiJson({ slug: made.slug, ...(guestToken ? { guest_token: guestToken } : {}) }, 201);
  } catch (e) {
    console.error("[api create plan]", e);
    return apiError("Couldn't make it just then. Try again in a sec.", 500);
  }
}
