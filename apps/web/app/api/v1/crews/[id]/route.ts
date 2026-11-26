import { apiError, apiJson, apiOrganiser, readBody } from "@/lib/api-auth";
import { CrewError, crewDetail, deleteCrew, updateCrew } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** The crew: members, and for the owner and admins, requests and everyone's links. Members only. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id } = await params;
  try {
    const detail = await crewDetail(id, me.id);
    return detail ? apiJson(detail) : apiError("Couldn't find that crew.", 404);
  } catch (e) {
    console.error("[api crews] detail", id, e);
    return apiError("Couldn't load the crew. Try again in a sec.", 500);
  }
}

/** `PUT { name?, emoji?, muted? }`: rename or new emoji (owner), mute for yourself (anyone). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id } = await params;
  try {
    return apiJson(await updateCrew(id, me.id, await readBody(req)));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] update", id, e);
    return apiError("Couldn't save that. Try again in a sec.", 500);
  }
}

/** Delete the crew. Owner only. Its plans stay with the people on them. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id } = await params;
  try {
    return apiJson(await deleteCrew(id, me.id));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] delete", id, e);
    return apiError("Couldn't delete the crew. Try again in a sec.", 500);
  }
}
