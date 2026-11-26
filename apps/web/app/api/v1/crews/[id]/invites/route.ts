import { crewPermissions, DEFAULT_INVITE_EXPIRY, INVITE_EXPIRY, INVITE_MAX_USES, type CrewInviteLink, type InviteExpiry, type InviteMaxUses } from "@dibs/shared/crews";
import { apiError, apiJson, apiOrganiser, readBody } from "@/lib/api-auth";
import { crews } from "@/lib/crews";

export const dynamic = "force-dynamic";

/** `POST { expiry?, max_uses? }`: a new invite link. Any member can make one (ARV-89). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id } = await params;
  // Not in the crew looks the same as no crew, so this can't be used to find crews.
  const role = await crews.roleIn(id, me.id).catch(() => null);
  if (!crewPermissions(role).makeInvite || !role) return apiError("Couldn't find that crew.", 404);
  const body = await readBody(req);
  const expiry: InviteExpiry = (INVITE_EXPIRY as readonly unknown[]).includes(body.expiry) ? (body.expiry as InviteExpiry) : DEFAULT_INVITE_EXPIRY;
  const maxUses: InviteMaxUses = (INVITE_MAX_USES as readonly unknown[]).includes(body.max_uses) ? (body.max_uses as InviteMaxUses) : null;
  try {
    const out: CrewInviteLink = await crews.createInvite({ crewId: id, userId: me.id, role, expiry, maxUses });
    return apiJson(out, 201);
  } catch (e) {
    console.error("[api crews] invite", id, e);
    return apiError("Couldn't make a link just then. Try again.", 500);
  }
}
