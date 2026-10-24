import { describe, expect, it } from "vitest";
import { unreadCount } from "./plans";

const msg = (kind: string, member_id: string | null, created_at: string) => ({ kind, member_id, created_at });
const thread = [
  msg("text", "sam", "2026-10-24T01:00:00Z"),
  msg("system", null, "2026-10-24T02:00:00Z"),
  msg("text", "me", "2026-10-24T03:00:00Z"),
  msg("dibby", null, "2026-10-24T04:00:00Z"),
  msg("text", "jo", "2026-10-24T05:00:00Z"),
];

describe("unreadCount", () => {
  it("counts what others and Dibby said since you last opened the chat", () => {
    expect(unreadCount(thread, { id: "me", joined_at: "2026-10-20T00:00:00Z", chat_seen_at: "2026-10-24T02:30:00Z" })).toBe(2);
  });
  it("never counts your own messages or system lines", () => {
    expect(unreadCount(thread, { id: "me", joined_at: "2026-10-20T00:00:00Z", chat_seen_at: "2026-10-23T00:00:00Z" })).toBe(3);
  });
  it("uses when you joined if you've never opened it", () => {
    expect(unreadCount(thread, { id: "me", joined_at: "2026-10-24T03:30:00Z", chat_seen_at: null })).toBe(2);
  });
  it("is zero when you're up to date", () => {
    expect(unreadCount(thread, { id: "me", joined_at: "2026-10-20T00:00:00Z", chat_seen_at: "2026-10-24T06:00:00Z" })).toBe(0);
  });
});
