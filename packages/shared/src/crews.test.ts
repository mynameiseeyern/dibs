import { describe, expect, it } from "vitest";
import {
  canAskToJoin,
  canRemoveFromCrew,
  canRevokeInvite,
  cleanCrew,
  crewPlanSections,
  suggestCrew,
  crewPermissions,
  crewPlanAccess,
  genericPreview,
  inviteExpiresAt,
  inviteStatus,
  leaveCrew,
  showCrewOnPlan,
  type JoinAsk,
} from "./crews";

const now = new Date("2026-11-26T08:00:00Z");
const days = (n: number) => n * 24 * 60 * 60_000;
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("crewPermissions", () => {
  it("any member makes plans and invites", () => {
    expect(crewPermissions("member")).toEqual({ makePlan: true, makeInvite: true, manageRequests: false, manageCrew: false });
  });
  it("admins also handle requests; only the owner manages the crew", () => {
    expect(crewPermissions("admin")).toMatchObject({ manageRequests: true, manageCrew: false });
    expect(crewPermissions("owner")).toMatchObject({ manageRequests: true, manageCrew: true });
  });
  it("outsiders can do nothing", () => {
    expect(Object.values(crewPermissions(null)).every((v) => v === false)).toBe(true);
  });
});

describe("removing and leaving", () => {
  it("owner removes anyone but the owner; admins remove members only", () => {
    expect(canRemoveFromCrew("owner", "admin")).toBe(true);
    expect(canRemoveFromCrew("owner", "owner")).toBe(false);
    expect(canRemoveFromCrew("admin", "member")).toBe(true);
    expect(canRemoveFromCrew("admin", "admin")).toBe(false);
    expect(canRemoveFromCrew("member", "member")).toBe(false);
    expect(canRemoveFromCrew(null, "member")).toBe(false);
  });
  it("the owner hands over before leaving, unless they're the last one", () => {
    expect(leaveCrew("member", 3)).toEqual({ ok: true, deletesCrew: false });
    expect(leaveCrew("owner", 3)).toEqual({ ok: false, why: "hand_over_first" });
    expect(leaveCrew("owner", 0)).toEqual({ ok: true, deletesCrew: true });
  });
});

describe("crewPlanAccess", () => {
  const crewOnly = { crewId: "c1", visibility: "crew" as const };
  it("link plans are open to anyone with the link", () => {
    expect(crewPlanAccess({ crewId: "c1", visibility: "link" }, { crewRole: null, onPlan: false })).toBe("see");
    expect(crewPlanAccess({ crewId: null, visibility: "link" }, { crewRole: null, onPlan: false })).toBe("see");
  });
  it("crew-only plans: the crew sees them, nobody else", () => {
    expect(crewPlanAccess(crewOnly, { crewRole: "member", onPlan: false })).toBe("see");
    expect(crewPlanAccess(crewOnly, { crewRole: null, onPlan: false })).toBe("blocked");
  });
  it("someone removed from the crew loses its crew-only plans, even ones they're on", () => {
    expect(crewPlanAccess(crewOnly, { crewRole: null, onPlan: true })).toBe("blocked");
  });
  it("a deleted crew's crew-only plans stay with the people already on them", () => {
    const orphan = { crewId: null, visibility: "crew" as const };
    expect(crewPlanAccess(orphan, { crewRole: null, onPlan: true })).toBe("see");
    expect(crewPlanAccess(orphan, { crewRole: null, onPlan: false })).toBe("blocked");
  });
});

describe("crew name and previews", () => {
  it("link plans show the crew to anyone; crew-only plans only to the crew", () => {
    expect(showCrewOnPlan({ crewId: "c1", visibility: "link" }, { crewRole: null })).toBe(true);
    expect(showCrewOnPlan({ crewId: "c1", visibility: "crew" }, { crewRole: null })).toBe(false);
    expect(showCrewOnPlan({ crewId: "c1", visibility: "crew" }, { crewRole: "member" })).toBe(true);
    expect(showCrewOnPlan({ crewId: null, visibility: "link" }, { crewRole: null })).toBe(false);
  });
  it("crew-only plans get a generic link preview", () => {
    expect(genericPreview({ visibility: "crew" })).toBe(true);
    expect(genericPreview({ visibility: "link" })).toBe(false);
  });
});

describe("invite links", () => {
  const fresh = { expiresAt: inviteExpiresAt("7d", now), maxUses: null, uses: 0, revokedAt: null };
  it("expiry choices", () => {
    expect(inviteExpiresAt("never", now)).toBeNull();
    expect(inviteExpiresAt("30m", now)!.getTime() - now.getTime()).toBe(30 * 60_000);
    expect(inviteExpiresAt("7d", now)!.getTime() - now.getTime()).toBe(days(7));
  });
  it("works until it's revoked, expired or used up", () => {
    expect(inviteStatus(fresh, now)).toBe("ok");
    expect(inviteStatus({ ...fresh, revokedAt: now }, now)).toBe("revoked");
    expect(inviteStatus(fresh, new Date(now.getTime() + days(7)))).toBe("expired");
    expect(inviteStatus({ ...fresh, maxUses: 5, uses: 5 }, now)).toBe("used_up");
    expect(inviteStatus({ ...fresh, maxUses: 5, uses: 4 }, now)).toBe("ok");
    expect(inviteStatus({ ...fresh, expiresAt: null }, new Date(now.getTime() + days(999)))).toBe("ok");
  });
  it("members revoke their own; owner and admins revoke any", () => {
    expect(canRevokeInvite({ userId: "a", role: "member" }, { createdBy: "a" })).toBe(true);
    expect(canRevokeInvite({ userId: "a", role: "member" }, { createdBy: "b" })).toBe(false);
    expect(canRevokeInvite({ userId: "a", role: "admin" }, { createdBy: "b" })).toBe(true);
    expect(canRevokeInvite({ userId: "a", role: null }, { createdBy: "a" })).toBe(false);
  });
});

describe("canAskToJoin", () => {
  const ask: JoinAsk = {
    alreadyMember: false,
    pendingForPerson: 0,
    pendingForCrew: 0,
    lastDeclinedAt: null,
    removedAt: null,
    invite: { createdByRole: "member", createdAt: ago(days(1)) },
  };
  it("a fresh ask goes through", () => expect(canAskToJoin(ask, now)).toEqual({ ok: true }));
  it("not if already in", () => expect(canAskToJoin({ ...ask, alreadyMember: true }, now)).toEqual({ ok: false, why: "already_member" }));
  it("5 pending per person, 20 per crew", () => {
    expect(canAskToJoin({ ...ask, pendingForPerson: 4 }, now)).toEqual({ ok: true });
    expect(canAskToJoin({ ...ask, pendingForPerson: 5 }, now)).toEqual({ ok: false, why: "too_many_pending" });
    expect(canAskToJoin({ ...ask, pendingForCrew: 20 }, now)).toEqual({ ok: false, why: "crew_queue_full" });
  });
  it("declined: can ask again after 7 days", () => {
    expect(canAskToJoin({ ...ask, lastDeclinedAt: ago(days(6)) }, now)).toEqual({ ok: false, why: "declined_recently" });
    expect(canAskToJoin({ ...ask, lastDeclinedAt: ago(days(7)) }, now)).toEqual({ ok: true });
  });
  it("removed: only through a fresh invite from the owner or an admin", () => {
    const removedAt = ago(days(3));
    expect(canAskToJoin({ ...ask, removedAt, invite: { createdByRole: "member", createdAt: ago(days(1)) } }, now)).toEqual({ ok: false, why: "removed" });
    expect(canAskToJoin({ ...ask, removedAt, invite: { createdByRole: "admin", createdAt: ago(days(5)) } }, now)).toEqual({ ok: false, why: "removed" });
    expect(canAskToJoin({ ...ask, removedAt, invite: { createdByRole: "admin", createdAt: ago(days(1)) } }, now)).toEqual({ ok: true });
    expect(canAskToJoin({ ...ask, removedAt, invite: { createdByRole: "owner", createdAt: ago(days(1)) } }, now)).toEqual({ ok: true });
  });
});

describe("cleanCrew", () => {
  it("needs a name and exactly one emoji", () => {
    expect(cleanCrew("  Dumpling   Gang ", "🥟")).toEqual({ name: "Dumpling Gang", emoji: "🥟" });
    expect(cleanCrew("", "🥟")).toBeNull();
    expect(cleanCrew("Gang", "")).toBeNull();
    expect(cleanCrew("Gang", "🥟🥟")).toBeNull();
    expect(cleanCrew("Gang", "ab")).toBeNull();
  });
  it("takes emoji made of several code points", () => {
    expect(cleanCrew("Gang", "👨‍👩‍👧")).not.toBeNull();
    expect(cleanCrew("Gang", "🇦🇺")).not.toBeNull();
    expect(cleanCrew("Gang", "👍🏽")).not.toBeNull();
  });
  it("caps the name at 40", () => expect(cleanCrew("x".repeat(60), "🔥")!.name).toHaveLength(40));
});

describe("crewPlanSections", () => {
  const now = Date.parse("2026-11-26T08:00:00Z");
  const row = (slug: string, o: Partial<import("./crews").CrewPlanRow>): import("./crews").CrewPlanRow => ({
    slug,
    title: slug,
    status: "voting",
    starts_at: null,
    when: null,
    place: null,
    area: null,
    going: 1,
    deciding: [],
    voted: false,
    rsvp: null,
    host: false,
    visibility: "crew",
    created_at: "2026-11-20T00:00:00Z",
    ...o,
  });
  it("splits into still deciding, coming up and past", () => {
    const { still_deciding, coming_up, past } = crewPlanSections(
      [
        row("vote-no-day", { status: "voting" }),
        row("fri", { status: "locked", starts_at: "2026-11-28T08:00:00Z" }),
        row("tomorrow", { status: "voting", starts_at: "2026-11-27T08:00:00Z", deciding: ["where"] }),
        row("set-no-day", { status: "locked" }),
        row("last-week", { status: "locked", starts_at: "2026-11-19T08:00:00Z" }),
        row("wrapped", { status: "wrapped", starts_at: "2026-11-24T08:00:00Z" }),
        row("off", { status: "cancelled", starts_at: "2026-11-29T08:00:00Z" }),
        row("tonight-started", { status: "locked", starts_at: "2026-11-26T05:00:00Z" }),
      ],
      now
    );
    expect(still_deciding.map((r) => r.slug)).toEqual(["vote-no-day"]);
    expect(coming_up.map((r) => r.slug)).toEqual(["tonight-started", "tomorrow", "fri", "set-no-day"]);
    expect(past.map((r) => r.slug)).toEqual(["off", "wrapped", "last-week"]);
  });
});

describe("suggestCrew", () => {
  const plan = [
    { user_id: "me", name: "Ee", rsvp: "in" },
    { user_id: "mia", name: "Mia", rsvp: "in" },
    { user_id: "sam", name: "Sam", rsvp: "maybe" },
    { user_id: "jo", name: "Jo", rsvp: "out" },
    { user_id: null, name: "Guest", rsvp: "in" },
    { user_id: "new", name: "New", rsvp: "in" },
  ];
  it("people with accounts who were on another of your plans, not you or can't-go", () => {
    expect(suggestCrew(plan, [["me", "mia", "sam", "jo"]], [], "me")).toEqual({
      key: "mia,sam",
      people: [
        { user_id: "mia", name: "Mia" },
        { user_id: "sam", name: "Sam" },
      ],
    });
  });
  it("needs at least two repeat people", () => expect(suggestCrew(plan, [["mia"]], [], "me")).toBeNull());
  it("not if they're already all in one of your crews", () => {
    expect(suggestCrew(plan, [["mia", "sam"]], [["me", "mia", "sam", "jo"]], "me")).toBeNull();
    expect(suggestCrew(plan, [["mia", "sam"]], [["me", "mia"]], "me")).not.toBeNull();
  });
  it("the same people give the same key, whatever the order", () => {
    expect(suggestCrew([...plan].reverse(), [["sam", "mia"]], [], "me")?.key).toBe("mia,sam");
  });
});
