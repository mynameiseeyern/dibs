import type { PlanDetail } from "@dibs/shared/api";
import type { CrewGone, CrewDetail, CrewInviteLink, CrewInvitePreview, InviteExpiry, InviteMaxUses, MyCrews, NewCrewResponse } from "@dibs/shared/crews";
import { call } from "./api";

// Crews (P-ARV-2): accounts only, app only. Kept out of lib/api.ts so crew work doesn't clash with it.
export const getMyCrews = () => call<MyCrews>("/api/v1/crews");
export const createCrew = (name: string, emoji: string) => call<NewCrewResponse>("/api/v1/crews", { method: "POST", body: { name, emoji } });
const crew = (id: string, path = "") => `/api/v1/crews/${encodeURIComponent(id)}${path}`;
export const getCrew = (id: string) => call<CrewDetail>(crew(id));
// Managing a crew (ARV-94).
export const updateCrew = (id: string, patch: { name?: string; emoji?: string; muted?: boolean }) => call<CrewDetail>(crew(id), { method: "PUT", body: patch });
export const deleteCrew = (id: string) => call<CrewGone>(crew(id), { method: "DELETE" });
export const leaveCrew = (id: string) => call<CrewGone>(crew(id, "/leave"), { method: "POST" });
export const setMemberRole = (id: string, userId: string, role: "admin" | "member" | "owner") =>
  call<CrewDetail>(crew(id, `/members/${encodeURIComponent(userId)}`), { method: "POST", body: { role } });
export const removeMember = (id: string, userId: string) => call<CrewDetail>(crew(id, `/members/${encodeURIComponent(userId)}`), { method: "DELETE" });
export const decideRequest = (id: string, requestId: string, approve: boolean) => call<CrewDetail>(crew(id, `/requests/${encodeURIComponent(requestId)}`), { method: "POST", body: { approve } });
export const revokeInvite = (id: string, inviteId: string) => call<CrewDetail>(crew(id, `/invites/${encodeURIComponent(inviteId)}`), { method: "DELETE" });

/** Hosts: put a plan into one of your crews, or take it out (null). `moved.visibility` says how it went in (ARV-95). */
export const movePlanToCrew = (slug: string, crewId: string | null) =>
  call<{ detail: PlanDetail; moved: { visibility: "crew" | "link" | null } }>(`/api/v1/plans/${encodeURIComponent(slug)}/crew`, { method: "POST", body: { crew_id: crewId } });

/** Hosts of a crew plan: the crew alone, or anyone with the link. */
export const setVisibility = (slug: string, visibility: "crew" | "link") =>
  call<PlanDetail>(`/api/v1/plans/${encodeURIComponent(slug)}/visibility`, { method: "PUT", body: { visibility } });

// An invite link (/c/<token>): what it shows, and asking to join.
const invite = (token: string, path = "") => `/api/v1/crews/invite/${encodeURIComponent(token)}${path}`;
export const previewInvite = (token: string) => call<CrewInvitePreview>(invite(token));
export const askToJoin = (token: string) => call<CrewInvitePreview>(invite(token, "/ask"), { method: "POST" });

export const newInvite = (crewId: string, opts: { expiry?: InviteExpiry; max_uses?: InviteMaxUses } = {}) =>
  call<CrewInviteLink>(`/api/v1/crews/${encodeURIComponent(crewId)}/invites`, { method: "POST", body: opts });

/** "Works for 7 days", "Works for 30 minutes", "Never expires". */
export function inviteLasts(invite: Pick<CrewInviteLink, "expires_at">, now = Date.now()): string {
  if (!invite.expires_at) return "Never expires";
  const mins = Math.round((new Date(invite.expires_at).getTime() - now) / 60_000);
  if (mins < 60) return `Works for ${mins} minutes`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Works for ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `Works for ${days} ${days === 1 ? "day" : "days"}`;
}

/** The message that goes with the link in the share sheet. */
export const inviteMessage = (crew: { name: string; emoji: string }, url: string) => `Come join ${crew.emoji} ${crew.name} so we stop making the same group chat. ${url}`;
