import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inviteExpiresAt, type CrewInviteLink, type CrewRole, type CrewSummary, type InviteExpiry, type InviteMaxUses } from "@dibs/shared/crews";
import { siteUrl } from "./site";

/**
 * Crews data (P-ARV-2), kept apart from lib/store so crew work doesn't touch the main store files.
 * Supabase with the service key when it's set up, in memory otherwise, like lib/store.
 * The service key skips row-level security: callers check the rules in @dibs/shared/crews first.
 */

interface CrewRow {
  id: string;
  name: string;
  emoji: string;
  created_by: string | null;
  created_at: string;
}
interface MemberRow {
  crew_id: string;
  user_id: string;
  role: CrewRole;
  muted: boolean;
  joined_at: string;
}
interface InviteRow {
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

export interface CrewStore {
  createCrew(userId: string, crew: { name: string; emoji: string }): Promise<CrewSummary>;
  myCrews(userId: string): Promise<CrewSummary[]>;
  /** Your role in a crew, or null if you're not in it. */
  roleIn(crewId: string, userId: string): Promise<CrewRole | null>;
  createInvite(i: { crewId: string; userId: string; role: CrewRole; expiry: InviteExpiry; maxUses: InviteMaxUses }): Promise<CrewInviteLink>;
}

/** The link carries a random token; only its hash is stored. */
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const newToken = () => randomBytes(24).toString("base64url");
export const inviteUrl = (token: string) => `${siteUrl()}/c/${token}`;

const summary = (c: CrewRow, role: CrewRole, members: number): CrewSummary => ({ id: c.id, name: c.name, emoji: c.emoji, role, members });

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
  async roleIn(crewId, userId) {
    const row = must(await admin().from("crew_members").select("role").eq("crew_id", crewId).eq("user_id", userId).maybeSingle()) as Pick<MemberRow, "role"> | null;
    return row?.role ?? null;
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
};

// ---------- In memory (local runs without Supabase) ----------

interface MemDb {
  crews: Map<string, CrewRow>;
  members: MemberRow[];
  invites: InviteRow[];
}
const g = globalThis as unknown as { __dibsCrews?: MemDb };
const mem: MemDb = (g.__dibsCrews ??= { crews: new Map(), members: [], invites: [] });

const memoryCrews: CrewStore = {
  async createCrew(userId, { name, emoji }) {
    const crew: CrewRow = { id: randomUUID(), name, emoji, created_by: userId, created_at: new Date().toISOString() };
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
  async roleIn(crewId, userId) {
    return mem.members.find((m) => m.crew_id === crewId && m.user_id === userId)?.role ?? null;
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
      created_at: new Date().toISOString(),
    });
    return { url: inviteUrl(token), expires_at: expires?.toISOString() ?? null, max_uses: maxUses };
  },
};

function byName(a: CrewSummary, b: CrewSummary) {
  return a.name.localeCompare(b.name);
}

const usingSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const crews: CrewStore = usingSupabase ? supabaseCrews : memoryCrews;
