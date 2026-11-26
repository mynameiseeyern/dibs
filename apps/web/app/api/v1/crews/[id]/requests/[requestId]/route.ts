import { apiError, apiJson, apiOrganiser, readBody } from "@/lib/api-auth";
import { CrewError, decideRequest } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** `POST { approve: true | false }`: say yes or no to someone asking to join. Owner and admins. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; requestId: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id, requestId } = await params;
  const body = await readBody(req);
  if (typeof body.approve !== "boolean") return apiError("Say yes or no.", 400);
  try {
    return apiJson(await decideRequest(id, requestId, body.approve, me.id));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] decide", id, e);
    return apiError("Couldn't save that. Try again in a sec.", 500);
  }
}
