import { ImageResponse } from "next/og";
import { OG, OG_FILL, OgMark, TAGLINE, ogFonts } from "@/lib/og";

// The card for a bare dibby.social link (and every page without its own card).
export const alt = "Dibby: plans sorted, money square. A plan card with four friends in.";
export const size = OG.size;
export const contentType = "image/png";

const CREW = [
  { m: "EN", bg: OG_FILL.violet },
  { m: "SL", bg: OG_FILL.sun },
  { m: "JT", bg: OG_FILL.mint },
  { m: "MK", bg: OG_FILL.tangerine },
];

// A small tilted plan card, for the edges of the card. Decoration: a square crop drops it.
function MiniCard({ when, title, n, crew, tilt, side }: { when: string; title: string; n: number; crew: typeof CREW; tilt: number; side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: side === "left" ? 150 : 250,
        [side]: -46,
        display: "flex",
        flexDirection: "column",
        width: 330,
        background: OG.white,
        color: OG.ink,
        borderRadius: 28,
        border: `4px solid ${OG.ink}`,
        boxShadow: `0 10px 0 ${OG.ink}`,
        padding: "24px 28px",
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600, color: OG.sub }}>{when}</div>
      <div style={{ fontFamily: "Bricolage", fontSize: 36, lineHeight: 1.02, letterSpacing: "-0.03em", marginTop: 8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
        <div style={{ display: "flex" }}>
          {crew.map((c, i) => (
            <div key={c.m} style={{ width: 48, height: 48, borderRadius: 24, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, marginLeft: i ? -10 : 0, border: `3px solid ${OG.white}` }}>
              {c.m}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap", background: OG.lime, fontSize: 24, fontWeight: 800, padding: "6px 16px", borderRadius: 999, border: `3px solid ${OG.ink}` }}>{n} in</div>
      </div>
    </div>
  );
}

// Everything that matters sits in the middle 630×630, because WhatsApp often shows a square crop
// from the centre. The two plan cards at the edges are decoration and can be cropped away.
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", background: OG.violet, color: OG.white, fontFamily: "Figtree", padding: "56px 0 52px" }}>
        <MiniCard when="Fri · 7 pm · Haymarket" title="Friday dumplings" n={4} crew={CREW} tilt={-8} side="left" />
        <MiniCard when="Sat · 10 am · Bondi" title="Beach brunch" n={3} crew={CREW.slice(1)} tilt={7} side="right" />
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Bricolage", fontSize: 44, letterSpacing: "-0.04em" }}>
          <OgMark size={58} tile="rgba(255,255,255,0.14)" />
          dibby
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 580 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Bricolage", fontSize: 80, lineHeight: 0.98, letterSpacing: "-0.035em" }}>
            {TAGLINE.split(", ").map((line, i, all) => (
              <span key={line}>{i < all.length - 1 ? `${line},` : line}</span>
            ))}
          </div>
          <div style={{ display: "flex", textAlign: "center", justifyContent: "center", fontSize: 28, lineHeight: 1.3, marginTop: 20, opacity: 0.92 }}>From &ldquo;we should catch up&rdquo; to actually going.</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, opacity: 0.85 }}>dibby.social</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  );
}
