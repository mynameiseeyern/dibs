import { apiError, apiJson, apiOrganiser } from "@/lib/api-auth";
import { CrewError, revokeInvite } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** Turn a link off. Your own, or anyone's if you're the owner or an admin. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id, inviteId } = await params;
  try {
    return apiJson(await revokeInvite(id, inviteId, me.id));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] revoke", id, e);
    return apiError("Couldn't turn that off. Try again in a sec.", 500);
  }
}
