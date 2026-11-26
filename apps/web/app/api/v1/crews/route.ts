import { cleanCrew, DEFAULT_INVITE_EXPIRY, type MyCrews, type NewCrewResponse } from "@dibs/shared/crews";
import { apiError, apiJson, apiOrganiser, readBody } from "@/lib/api-auth";
import { crews } from "@/lib/crews";

export const dynamic = "force-dynamic";

/** Your crews. Accounts only. */
export async function GET(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in to see your crews.", 401);
  try {
    const body: MyCrews = { crews: await crews.myCrews(me.id) };
    return apiJson(body);
  } catch (e) {
    console.error("[api crews] list", me.id, e);
    return apiError("Couldn't load your crews. Try again in a sec.", 500);
  }
}

/** `POST { name, emoji }`: a new crew, you as owner, and a 7-day invite link to share straight away. */
export async function POST(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in to make a crew.", 401);
  const body = await readBody(req);
  const crew = cleanCrew(body.name, body.emoji);
  if (!crew) return apiError(body.name ? "Pick one emoji for your crew." : "Give your crew a name.", 400);
  try {
    const made = await crews.createCrew(me.id, crew);
    const invite = await crews.createInvite({ crewId: made.id, userId: me.id, role: "owner", expiry: DEFAULT_INVITE_EXPIRY, maxUses: null });
    const out: NewCrewResponse = { crew: made, invite };
    return apiJson(out, 201);
  } catch (e) {
    console.error("[api crews] create", me.id, e);
    return apiError("Couldn't make that crew. Try again in a sec.", 500);
  }
}
