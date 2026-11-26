import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inviteExpiresAt, type CrewInviteLink, type CrewRole, type CrewSummary, type InviteExpiry, type InviteMaxUses, type PlanVisibility } from "@dibs/shared/crews";
import { siteUrl } from "./site";

/**
 * Crews data (P-ARV-2), kept apart from lib/store so crew work doesn't touch the main store files.
 * Supabase with the service key when it's set up, in memory otherwise, like lib/store.
 * The service key skips row-level security: callers check the rules in @dibs/shared/crews first
 * (lib/crew-ops.ts does, for the routes).
 */

export interface CrewRow {
  id: string;
  name: string;
  emoji: string;
  created_by: string | null;
  created_at: string;
}
export interface MemberRow {
  crew_id: string;
  user_id: string;
  role: CrewRole;
  muted: boolean;
  joined_at: string;
}
export interface InviteRow {
  id: string;
  crew_id: string;
  token_hash: string;
  created_by: string | null;
  created_by_role: CrewRole;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  revoked_at: string | null;
  created_at: string;
}
export type RequestStatus = "pending" | "approved" | "declined" | "cancelled";
export interface RequestRow {
  id: string;
  crew_id: string;
  user_id: string;
  invite_id: string | null;
  status: RequestStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface CrewStore {
  createCrew(userId: string, crew: { name: string; emoji: string }): Promise<CrewSummary>;
  myCrews(userId: string): Promise<CrewSummary[]>;
  getCrew(crewId: string): Promise<CrewRow | null>;
  /** Your role in a crew, or null if you're not in it. */
  roleIn(crewId: string, userId: string): Promise<CrewRole | null>;
  listMembers(crewId: string): Promise<MemberRow[]>;
  addMember(crewId: string, userId: string, role: CrewRole): Promise<void>;

  createInvite(i: { crewId: string; userId: string; role: CrewRole; expiry: InviteExpiry; maxUses: InviteMaxUses }): Promise<CrewInviteLink>;
  /** The invite behind a link, by its token (we look it up by hash). */
  inviteByToken(token: string): Promise<InviteRow | null>;
  getInvite(inviteId: string): Promise<InviteRow | null>;
  listInvites(crewId: string): Promise<InviteRow[]>;
  useInvite(inviteId: string): Promise<void>;
  revokeInvite(inviteId: string): Promise<void>;

  addRequest(r: { crewId: string; userId: string; inviteId: string }): Promise<RequestRow>;
  getRequest(requestId: string): Promise<RequestRow | null>;
  /** A person's requests to one crew, newest first. */
  requestsBy(crewId: string, userId: string): Promise<RequestRow[]>;
  pendingRequests(crewId: string): Promise<RequestRow[]>;
  /** How many pending requests this person has open, across every crew. */
  pendingCountFor(userId: string): Promise<number>;
  decideRequest(requestId: string, status: "approved" | "declined", by: string): Promise<void>;
  removedAt(crewId: string, userId: string): Promise<string | null>;
  clearRemoval(crewId: string, userId: string): Promise<void>;

  /** Which crew a plan belongs to and who can see it. Every plan that isn't a crew's: no crew, by link. */
  planCrew(plan: { id: string }): Promise<PlanCrew>;
  setPlanCrew(planId: string, crew: PlanCrew): Promise<void>;
}

export interface PlanCrew {
  crewId: string | null;
  visibility: PlanVisibility;
}
const NO_CREW: PlanCrew = { crewId: null, visibility: "link" };

/** The link carries a random token; only its hash is stored. */
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const newToken = () => randomBytes(24).toString("base64url");
export const inviteUrl = (token: string) => `${siteUrl()}/c/${token}`;
/** A token is base64url, 32 characters. Anything else isn't worth a lookup. */
export const looksLikeToken = (t: string) => /^[A-Za-z0-9_-]{20,64}$/.test(t);

const summary = (c: CrewRow, role: CrewRole, members: number): CrewSummary => ({ id: c.id, name: c.name, emoji: c.emoji, role, members });
const byName = (a: CrewSummary, b: CrewSummary) => a.name.localeCompare(b.name);
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ---------- Supabase ----------

let client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const supabaseCrews: CrewStore = {
  async createCrew(userId, { name, emoji }) {
    const crew = must(await admin().from("crews").insert({ name, emoji, created_by: userId }).select("*").single()) as CrewRow;
    const added = await admin().from("crew_members").insert({ crew_id: crew.id, user_id: userId, role: "owner" });
    if (added.error) {
      await admin().from("crews").delete().eq("id", crew.id);
      throw new Error(added.error.message);
    }
    return summary(crew, "owner", 1);
  },
  async myCrews(userId) {
    const mine = must(await admin().from("crew_members").select("*").eq("user_id", userId)) as MemberRow[];
    if (mine.length === 0) return [];
    const ids = mine.map((m) => m.crew_id);
    const crews = must(await admin().from("crews").select("*").in("id", ids)) as CrewRow[];
    const everyone = must(await admin().from("crew_members").select("crew_id").in("crew_id", ids)) as Pick<MemberRow, "crew_id">[];
    const counts = new Map<string, number>();
    for (const m of everyone) counts.set(m.crew_id, (counts.get(m.crew_id) ?? 0) + 1);
    const roles = new Map(mine.map((m) => [m.crew_id, m.role]));
    return crews.map((c) => summary(c, roles.get(c.id)!, counts.get(c.id) ?? 1)).sort(byName);
  },
  async getCrew(crewId) {
    if (!isUuid(crewId)) return null;
    return must(await admin().from("crews").select("*").eq("id", crewId).maybeSingle()) as CrewRow | null;
  },
  async roleIn(crewId, userId) {
    if (!isUuid(crewId)) return null;
    const row = must(await admin().from("crew_members").select("role").eq("crew_id", crewId).eq("user_id", userId).maybeSingle()) as Pick<MemberRow, "role"> | null;
    return row?.role ?? null;
  },
  async listMembers(crewId) {
    return must(await admin().from("crew_members").select("*").eq("crew_id", crewId).order("joined_at")) as MemberRow[];
  },
  async addMember(crewId, userId, role) {
    must(await admin().from("crew_members").upsert({ crew_id: crewId, user_id: userId, role }, { onConflict: "crew_id,user_id", ignoreDuplicates: true }));
  },
  async createInvite({ crewId, userId, role, expiry, maxUses }) {
    const token = newToken();
    const expires = inviteExpiresAt(expiry, new Date());
    must(
      await admin().from("crew_invites").insert({
        crew_id: crewId,
        token_hash: hashToken(token),
        created_by: userId,
        created_by_role: role,
        expires_at: expires?.toISOString() ?? null,
        max_uses: maxUses,
      })
    );
    return { url: inviteUrl(token), expires_at: expires?.toISOString() ?? null, max_uses: maxUses };
  },
  async inviteByToken(token) {
    return must(await admin().from("crew_invites").select("*").eq("token_hash", hashToken(token)).maybeSingle()) as InviteRow | null;
  },
  async getInvite(inviteId) {
    if (!isUuid(inviteId)) return null;
    return must(await admin().from("crew_invites").select("*").eq("id", inviteId).maybeSingle()) as InviteRow | null;
  },
  async listInvites(crewId) {
    return must(await admin().from("crew_invites").select("*").eq("crew_id", crewId).order("created_at", { ascending: false })) as InviteRow[];
  },
  async useInvite(inviteId) {
    const row = must(await admin().from("crew_invites").select("uses").eq("id", inviteId).single()) as { uses: number };
    must(await admin().from("crew_invites").update({ uses: row.uses + 1 }).eq("id", inviteId));
  },
  async revokeInvite(inviteId) {
    must(await admin().from("crew_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId).is("revoked_at", null));
  },
  async addRequest({ crewId, userId, inviteId }) {
    return must(await admin().from("crew_join_requests").insert({ crew_id: crewId, user_id: userId, invite_id: inviteId }).select("*").single()) as RequestRow;
  },
  async getRequest(requestId) {
    if (!isUuid(requestId)) return null;
    return must(await admin().from("crew_join_requests").select("*").eq("id", requestId).maybeSingle()) as RequestRow | null;
  },
  async requestsBy(crewId, userId) {
    return must(await admin().from("crew_join_requests").select("*").eq("crew_id", crewId).eq("user_id", userId).order("created_at", { ascending: false })) as RequestRow[];
  },
  async pendingRequests(crewId) {
    return must(await admin().from("crew_join_requests").select("*").eq("crew_id", crewId).eq("status", "pending").order("created_at")) as RequestRow[];
  },
  async pendingCountFor(userId) {
    const res = await admin().from("crew_join_requests").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending");
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  },
  async decideRequest(requestId, status, by) {
    must(await admin().from("crew_join_requests").update({ status, decided_at: new Date().toISOString(), decided_by: by }).eq("id", requestId).eq("status", "pending"));
  },
  async removedAt(crewId, userId) {
    const row = must(await admin().from("crew_removals").select("removed_at").eq("crew_id", crewId).eq("user_id", userId).maybeSingle()) as { removed_at: string } | null;
    return row?.removed_at ?? null;
  },
  async clearRemoval(crewId, userId) {
    must(await admin().from("crew_removals").delete().eq("crew_id", crewId).eq("user_id", userId));
  },
  async planCrew(plan) {
    // Plans are read with select("*"), so the row usually has the columns already.
    const row = plan as { crew_id?: string | null; visibility?: PlanVisibility };
    if (row.visibility) return { crewId: row.crew_id ?? null, visibility: row.visibility };
    const got = must(await admin().from("plans").select("crew_id, visibility").eq("id", plan.id).maybeSingle()) as { crew_id: string | null; visibility: PlanVisibility } | null;
    return got ? { crewId: got.crew_id, visibility: got.visibility } : NO_CREW;
  },
  async setPlanCrew(planId, { crewId, visibility }) {
    must(await admin().from("plans").update({ crew_id: crewId, visibility }).eq("id", planId));
  },
};

// ---------- In memory (local runs without Supabase) ----------

interface MemDb {
  crews: Map<string, CrewRow>;
  members: MemberRow[];
  invites: InviteRow[];
  requests: RequestRow[];
  removals: { crew_id: string; user_id: string; removed_at: string }[];
  /** Plan id → its crew. The in-memory plans live in lib/store/memory.ts. */
  planCrews: Map<string, PlanCrew>;
}
const g = globalThis as unknown as { __dibsCrews?: MemDb };
const mem: MemDb = (g.__dibsCrews ??= { crews: new Map(), members: [], invites: [], requests: [], removals: [], planCrews: new Map() });
mem.requests ??= [];
mem.removals ??= [];
mem.planCrews ??= new Map();
const now = () => new Date().toISOString();

const memoryCrews: CrewStore = {
  async createCrew(userId, { name, emoji }) {
    const crew: CrewRow = { id: randomUUID(), name, emoji, created_by: userId, created_at: now() };
    mem.crews.set(crew.id, crew);
    mem.members.push({ crew_id: crew.id, user_id: userId, role: "owner", muted: false, joined_at: crew.created_at });
    return summary(crew, "owner", 1);
  },
  async myCrews(userId) {
    return mem.members
      .filter((m) => m.user_id === userId)
      .flatMap((m) => {
        const c = mem.crews.get(m.crew_id);
        return c ? [summary(c, m.role, mem.members.filter((x) => x.crew_id === c.id).length)] : [];
      })
      .sort(byName);
  },
  async getCrew(crewId) {
    return mem.crews.get(crewId) ?? null;
  },
  async roleIn(crewId, userId) {
    return mem.members.find((m) => m.crew_id === crewId && m.user_id === userId)?.role ?? null;
  },
  async listMembers(crewId) {
    return mem.members.filter((m) => m.crew_id === crewId);
  },
  async addMember(crewId, userId, role) {
    if (!mem.members.some((m) => m.crew_id === crewId && m.user_id === userId)) mem.members.push({ crew_id: crewId, user_id: userId, role, muted: false, joined_at: now() });
  },
  async createInvite({ crewId, userId, role, expiry, maxUses }) {
    const token = newToken();
    const expires = inviteExpiresAt(expiry, new Date());
    mem.invites.push({
      id: randomUUID(),
      crew_id: crewId,
      token_hash: hashToken(token),
      created_by: userId,
      created_by_role: role,
      expires_at: expires?.toISOString() ?? null,
      max_uses: maxUses,
      uses: 0,
      revoked_at: null,
      created_at: now(),
    });
    return { url: inviteUrl(token), expires_at: expires?.toISOString() ?? null, max_uses: maxUses };
  },
  async inviteByToken(token) {
    const h = hashToken(token);
    return mem.invites.find((i) => i.token_hash === h) ?? null;
  },
  async getInvite(inviteId) {
    return mem.invites.find((i) => i.id === inviteId) ?? null;
  },
  async listInvites(crewId) {
    return mem.invites.filter((i) => i.crew_id === crewId).reverse();
  },
  async useInvite(inviteId) {
    const i = mem.invites.find((x) => x.id === inviteId);
    if (i) i.uses += 1;
  },
  async revokeInvite(inviteId) {
    const i = mem.invites.find((x) => x.id === inviteId);
    if (i && !i.revoked_at) i.revoked_at = now();
  },
  async addRequest({ crewId, userId, inviteId }) {
    if (mem.requests.some((r) => r.crew_id === crewId && r.user_id === userId && r.status === "pending")) throw new Error("duplicate key: one pending request");
    const r: RequestRow = { id: randomUUID(), crew_id: crewId, user_id: userId, invite_id: inviteId, status: "pending", created_at: now(), decided_at: null, decided_by: null };
    mem.requests.push(r);
    return r;
  },
  async getRequest(requestId) {
    return mem.requests.find((r) => r.id === requestId) ?? null;
  },
  async requestsBy(crewId, userId) {
    return mem.requests.filter((r) => r.crew_id === crewId && r.user_id === userId).reverse();
  },
  async pendingRequests(crewId) {
    return mem.requests.filter((r) => r.crew_id === crewId && r.status === "pending");
  },
  async pendingCountFor(userId) {
    return mem.requests.filter((r) => r.user_id === userId && r.status === "pending").length;
  },
  async decideRequest(requestId, status, by) {
    const r = mem.requests.find((x) => x.id === requestId && x.status === "pending");
    if (r) Object.assign(r, { status, decided_at: now(), decided_by: by });
  },
  async removedAt(crewId, userId) {
    return mem.removals.find((r) => r.crew_id === crewId && r.user_id === userId)?.removed_at ?? null;
  },
  async clearRemoval(crewId, userId) {
    mem.removals = mem.removals.filter((r) => !(r.crew_id === crewId && r.user_id === userId));
  },
  async planCrew(plan) {
    return mem.planCrews.get(plan.id) ?? NO_CREW;
  },
  async setPlanCrew(planId, crew) {
    mem.planCrews.set(planId, crew);
  },
};

const usingSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const crews: CrewStore = usingSupabase ? supabaseCrews : memoryCrews;
