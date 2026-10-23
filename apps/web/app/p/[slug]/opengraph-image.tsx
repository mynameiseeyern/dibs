import { ImageResponse } from "next/og";
import { countIn, monogram } from "@dibs/shared/plans";
import { store } from "@/lib/store";
import { formatWhen } from "@/lib/time";
import { OG, OG_FILL, OG_HEADERS, OgMark, ogFonts } from "@/lib/og";

// The WhatsApp / iMessage preview card. The share link carries ?v=<version>, so a changed
// plan gets a fresh card instead of WhatsApp's cached one. Only what anyone with the link sees.
export const alt = "A plan on dibs: what, when, where and who's in";
export const size = OG.size;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await store.getPlanBySlug(slug);
  const members = plan ? await store.listMembers(plan.id) : [];
  const going = members.filter((m) => m.rsvp === "in" && !m.waitlisted);
  const shown = going.slice(0, 5);
  const more = going.length - shown.length;
  const voting = plan?.status === "voting" && !plan.venue_name;
  const facts = plan ? [formatWhen(plan.starts_at), voting ? "Place up for a vote" : plan.venue_name ?? plan.area].filter(Boolean).join(" · ") : "";
  const n = plan ? countIn(members) : 0;
  const cancelled = plan?.status === "cancelled";
  const status = cancelled ? "Called off" : plan?.status === "wrapped" ? `${n} went` : n === 0 ? "You in?" : `${n} in`;
  const title = plan?.title ?? "A plan on dibs";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: OG.violet, color: OG.white, padding: "64px 72px", fontFamily: "Figtree" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Bricolage", fontSize: 44, letterSpacing: "-0.04em" }}>
          <OgMark size={56} tile="rgba(255,255,255,0.14)" />
          dibs
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Bricolage", fontSize: title.length > 40 ? 64 : title.length > 22 ? 76 : 96, lineHeight: 1, letterSpacing: "-0.03em", textDecoration: cancelled ? "line-through" : "none" }}>{title}</div>
          {facts && <div style={{ fontSize: 38, marginTop: 20, opacity: 0.92 }}>{facts}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {shown.map((m, i) => (
              <div key={m.id} style={{ width: 76, height: 76, borderRadius: 38, background: OG_FILL[m.colour] ?? OG_FILL.violet, color: OG.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, marginLeft: i ? -14 : 0, border: `5px solid ${OG.violet}` }}>
                {monogram(m.display_name)}
              </div>
            ))}
            {more > 0 && <div style={{ fontSize: 32, fontWeight: 800, marginLeft: 16 }}>+{more}</div>}
          </div>
          <div style={{ display: "flex", background: cancelled ? OG.white : OG.lime, color: OG.ink, fontSize: 40, fontWeight: 800, padding: "16px 30px", borderRadius: 999, border: `3px solid ${OG.ink}`, boxShadow: `0 6px 0 ${OG.ink}` }}>
            {status}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts(), headers: OG_HEADERS }
  );
}
