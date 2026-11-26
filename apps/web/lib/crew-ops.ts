import "server-only";
import {
  canAskToJoin,
  crewPlanSections,
  type CrewPlanRow,
  type CrewPlanSections,
  canRevokeInvite,
  crewPermissions,
  inviteStatus,
  JOIN_ASK_NOTE,
  type CrewDetail,
  type CrewInvitePreview,
  type CrewInviteRow,
  type CrewRole,
} from "@dibs/shared/crews";
import { crews, looksLikeToken, type CrewRow, type InviteRow } from "./crews";
import { pushToUsers } from "./push";
import { store } from "./store";
import { formatShort } from "./time";
import { countIn } from "@dibs/shared/plans";

/**
 * Crews, the rules applied (ARV-91). Every crew route goes through here, so each check sits in
 * one place. The data is lib/crews.ts; the rules are @dibs/shared/crews.
 */

export class CrewError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Not in the crew looks the same as no crew, so a route can't be used to find crews. */
const NOT_FOUND = () => new CrewError("Couldn't find that crew.", 404);

async function nameOf(userId: string | null, short = false): Promise<string | null> {
  if (!userId) return null;
  const p = await store.getProfile(userId).catch(() => null);
  if (!p) return null;
  return short ? p.first_name : `${p.first_name} ${p.last_name}`.trim();
}

const asDate = (iso: string | null) => (iso ? new Date(iso) : null);
const live = (i: InviteRow, now = new Date()) =>
  inviteStatus({ expiresAt: asDate(i.expires_at), maxUses: i.max_uses, uses: i.uses, revokedAt: asDate(i.revoked_at) }, now) === "ok";

/** The invite behind a link, only if it still works. */
async function workingInvite(token: string): Promise<InviteRow | null> {
  if (!looksLikeToken(token)) return null;
  const invite = await crews.inviteByToken(token);
  return invite && live(invite) ? invite : null;
}

/** Everything canAskToJoin needs, for this person and this crew. */
async function joinCheck(invite: InviteRow, userId: string) {
  const [role, mine, pendingForPerson, pendingForCrew, removedAt] = await Promise.all([
    crews.roleIn(invite.crew_id, userId),
    crews.requestsBy(invite.crew_id, userId),
    crews.pendingCountFor(userId),
    crews.pendingRequests(invite.crew_id).then((r) => r.length),
    crews.removedAt(invite.crew_id, userId),
  ]);
  const pending = mine.some((r) => r.status === "pending");
  const lastDeclined = mine.find((r) => r.status === "declined");
  const result = canAskToJoin(
    {
      alreadyMember: role !== null,
      pendingForPerson,
      pendingForCrew,
      lastDeclinedAt: asDate(lastDeclined?.decided_at ?? null),
      removedAt: asDate(removedAt),
      invite: { createdByRole: invite.created_by_role, createdAt: new Date(invite.created_at) },
    },
    new Date()
  );
  return { role, pending, result };
}

export async function previewInvite(token: string, userId: string | null): Promise<CrewInvitePreview> {
  const invite = await workingInvite(token);
  const crew = invite ? await crews.getCrew(invite.crew_id) : null;
  if (!invite || !crew) return { status: "expired" };
  return previewOf(invite, crew, userId);
}

/** What the link shows, for a link already checked (asking can use up its last use, so don't check again). */
async function previewOf(invite: InviteRow, crew: CrewRow, userId: string | null): Promise<CrewInvitePreview> {
  const members = (await crews.listMembers(crew.id)).length;
  const base: CrewInvitePreview = {
    status: "ok",
    crew: { name: crew.name, emoji: crew.emoji, members },
    invited_by: await nameOf(invite.created_by, true),
  };
  if (!userId) return { ...base, you: "signed_out" };
  const { role, pending, result } = await joinCheck(invite, userId);
  if (role) return { ...base, you: "member", crew_id: crew.id };
  if (pending) return { ...base, you: "pending" };
  return result.ok ? { ...base, you: "can_ask" } : { ...base, you: "cant_ask", note: JOIN_ASK_NOTE[result.why] };
}

export async function askToJoin(token: string, userId: string): Promise<CrewInvitePreview> {
  const invite = await workingInvite(token);
  const crew = invite ? await crews.getCrew(invite.crew_id) : null;
  if (!invite || !crew) throw new CrewError("This invite's expired. Ask for a new one.", 410);
  const { role, pending, result } = await joinCheck(invite, userId);
  if (role || pending) return previewOf(invite, crew, userId);
  if (!result.ok) throw new CrewError(JOIN_ASK_NOTE[result.why], 409);

  try {
    await crews.addRequest({ crewId: crew.id, userId, inviteId: invite.id });
  } catch {
    // Two taps at once: the database keeps one pending request each.
    return previewOf(invite, crew, userId);
  }
  await crews.useInvite(invite.id);

  const leads = (await crews.listMembers(crew.id)).filter((m) => m.role === "owner" || m.role === "admin").map((m) => m.user_id);
  const who = (await nameOf(userId, true)) ?? "Someone";
  pushToUsers(store, leads, { title: `${crew.emoji} ${crew.name}`, body: `${who} wants to join the crew`, url: `/crews/${crew.id}` });
  return previewOf(invite, crew, userId);
}

/** The crew, as a member sees it. Null for anyone not in it. */
export async function crewDetail(crewId: string, userId: string): Promise<CrewDetail | null> {
  const role = await crews.roleIn(crewId, userId);
  const crew = role ? await crews.getCrew(crewId) : null;
  if (!role || !crew) return null;
  const can = crewPermissions(role);
  const [members, requests, invites] = await Promise.all([
    crews.listMembers(crewId),
    can.manageRequests ? crews.pendingRequests(crewId) : Promise.resolve([]),
    crews.listInvites(crewId),
  ]);
  const order: Record<CrewRole, number> = { owner: 0, admin: 1, member: 2 };
  const visible = invites.filter((i) => live(i) && (can.manageRequests || i.created_by === userId));
  return {
    crew: { id: crew.id, name: crew.name, emoji: crew.emoji, role, members: members.length },
    members: (
      await Promise.all(members.map(async (m) => ({ user_id: m.user_id, name: (await nameOf(m.user_id)) ?? "Someone", role: m.role, you: m.user_id === userId })))
    ).sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name)),
    requests: await Promise.all(requests.map(async (r) => ({ id: r.id, name: (await nameOf(r.user_id)) ?? "Someone", asked_at: r.created_at }))),
    invites: await Promise.all(
      visible.map(
        async (i): Promise<CrewInviteRow> => ({
          id: i.id,
          made_by: await nameOf(i.created_by, true),
          mine: i.created_by === userId,
          uses: i.uses,
          max_uses: i.max_uses,
          expires_at: i.expires_at,
        })
      )
    ),
    can,
    plans: await crewPlans(crewId, userId),
  };
}

/**
 * The crew's plans, as this member sees them (ARV-92). Every plan in the crew is theirs to see,
 * crew only or by link. Called off plans stay, in Past.
 */
async function crewPlans(crewId: string, userId: string): Promise<CrewPlanSections> {
  const ids = await crews.crewPlanIds(crewId);
  const rows = await Promise.all(
    ids.map(async (id): Promise<CrewPlanRow | null> => {
      const plan = await store.getPlanById(id);
      if (!plan) return null;
      const [members, { visibility }] = await Promise.all([store.listMembers(id), crews.planCrew(plan)]);
      const me = members.find((m) => m.user_id === userId) ?? null;
      const voting = plan.status === "voting";
      const whereUp = voting && !plan.venue_name;
      const [times, votes, timeVotes] = await Promise.all([
        voting && !plan.starts_at ? store.listTimes(id) : Promise.resolve([]),
        whereUp && me ? store.listVotes(id) : Promise.resolve([]),
        voting && !plan.starts_at && me ? store.listTimeVotes(id) : Promise.resolve([]),
      ]);
      const whenUp = voting && !plan.starts_at && times.length > 0;
      const deciding: CrewPlanRow["deciding"] = [...(whenUp ? (["when"] as const) : []), ...(whereUp ? (["where"] as const) : [])];
      const voted = Boolean(me) && ((whereUp && votes.some((v) => v.member_id === me!.id)) || (whenUp && timeVotes.some((v) => v.member_id === me!.id)));
      return {
        slug: plan.slug,
        title: plan.title,
        status: plan.status,
        starts_at: plan.starts_at,
        when: formatShort(plan.starts_at),
        place: plan.venue_name,
        area: plan.area,
        going: countIn(members),
        deciding,
        voted,
        rsvp: me?.rsvp ?? null,
        host: me?.role === "organiser" || me?.role === "cohost",
        visibility,
        created_at: plan.created_at,
      };
    })
  );
  return crewPlanSections(
    rows.filter((r): r is CrewPlanRow => r !== null),
    Date.now()
  );
}

/** Yes or no to a request. Owner and admins only. */
export async function decideRequest(crewId: string, requestId: string, approve: boolean, actorId: string): Promise<CrewDetail> {
  const role = await crews.roleIn(crewId, actorId);
  if (!role) throw NOT_FOUND();
  if (!crewPermissions(role).manageRequests) throw new CrewError("Only the owner or an admin can do that.", 403);
  const req = await crews.getRequest(requestId);
  if (!req || req.crew_id !== crewId) throw new CrewError("That request's gone.", 404);
  if (req.status === "pending") {
    await crews.decideRequest(requestId, approve ? "approved" : "declined", actorId);
    const crew = await crews.getCrew(crewId);
    if (approve) {
      await crews.addMember(crewId, req.user_id, "member");
      await crews.clearRemoval(crewId, req.user_id);
      if (crew) pushToUsers(store, [req.user_id], { title: `${crew.emoji} ${crew.name}`, body: "You're in the crew", url: `/crews/${crewId}` });
    }
    // A no isn't pushed: they find out when they look, and it never says who said no.
  }
  return (await crewDetail(crewId, actorId))!;
}

export async function revokeInvite(crewId: string, inviteId: string, actorId: string): Promise<CrewDetail> {
  const role = await crews.roleIn(crewId, actorId);
  if (!role) throw NOT_FOUND();
  const invite = await crews.getInvite(inviteId);
  if (!invite || invite.crew_id !== crewId) throw new CrewError("That link's gone.", 404);
  if (!canRevokeInvite({ userId: actorId, role }, { createdBy: invite.created_by })) throw new CrewError("You can only turn off links you made.", 403);
  await crews.revokeInvite(inviteId);
  return (await crewDetail(crewId, actorId))!;
}
