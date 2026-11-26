import { ImageResponse } from "next/og";
import { countIn, monogram } from "@dibs/shared/plans";
import { store } from "@/lib/store";
import { crews } from "@/lib/crews";
import { formatWhen } from "@/lib/time";
import { OG, OG_FILL, OgMark, ogFonts } from "@/lib/og";

/**
 * The WhatsApp / iMessage preview card for a plan. Its link carries ?k=<card key> (lib/plan-preview.ts),
 * a fingerprint of everything drawn on it, so when someone joins or the plan changes the card has a
 * new address and WhatsApp fetches it fresh instead of reusing the picture it cached. Because the key
 * pins the content, each version can be cached for good. Only what anyone with the link sees.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return Image({ params });
}

async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await store.getPlanBySlug(slug);
  // Crew-only plans draw the generic card, as for a wrong link: nothing about the plan (ARV-89).
  const plan = found && (await crews.planCrew(found)).visibility === "crew" ? null : found;
  const members = plan ? await store.listMembers(plan.id) : [];
  const going = members.filter((m) => m.rsvp === "in" && !m.waitlisted);
  const shown = going.slice(0, 5);
  const more = going.length - shown.length;
  const voting = plan?.status === "voting" && !plan.venue_name;
  // When, then where, each on its own line so neither wraps inside the square.
  const facts = plan ? [formatWhen(plan.starts_at), voting ? "Place up for a vote" : plan.venue_name ?? plan.area].filter((x): x is string => Boolean(x)) : [];
  const n = plan ? countIn(members) : 0;
  const cancelled = plan?.status === "cancelled";
  const status = cancelled ? "Called off" : plan?.status === "wrapped" ? `${n} went` : n === 0 ? "You in?" : `${n} in`;
  const title = plan?.title ?? "A plan on Dibby";

  // Everything that matters sits in the middle 630×630: WhatsApp often shows a square crop from the
  // centre (Android, and links that aren't at the start of a message), so a left-aligned card got cut
  // to "y dumplings". Centred, the square and the full card both read.
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", background: OG.violet, color: OG.white, padding: "52px 72px 60px", fontFamily: "Figtree", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Bricolage", fontSize: 38, letterSpacing: "-0.04em" }}>
          <OgMark size={48} tile="rgba(255,255,255,0.14)" />
          dibby
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 600 }}>
          <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontFamily: "Bricolage", fontSize: title.length > 40 ? 54 : title.length > 18 ? 66 : 84, lineHeight: 1.02, letterSpacing: "-0.03em", textDecoration: cancelled ? "line-through" : "none" }}>{title}</div>
          {facts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 32, lineHeight: 1.3, marginTop: 16, opacity: 0.92 }}>
              {facts.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {shown.length > 0 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {shown.map((m, i) => (
                <div key={m.id} style={{ width: 72, height: 72, borderRadius: 36, background: OG_FILL[m.colour] ?? OG_FILL.violet, color: OG.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginLeft: i ? -14 : 0, border: `5px solid ${OG.violet}` }}>
                  {monogram(m.display_name)}
                </div>
              ))}
              {more > 0 && <div style={{ fontSize: 30, fontWeight: 800, marginLeft: 12 }}>+{more}</div>}
            </div>
          )}
          <div style={{ display: "flex", background: cancelled ? OG.white : OG.lime, color: OG.ink, fontSize: 38, fontWeight: 800, padding: "14px 30px", borderRadius: 999, border: `3px solid ${OG.ink}`, boxShadow: `0 6px 0 ${OG.ink}` }}>
            {status}
          </div>
        </div>
      </div>
    ),
    { ...OG.size, fonts: await ogFonts(), headers: { "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" } }
  );
}
