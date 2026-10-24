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

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG.violet, color: OG.white, fontFamily: "Figtree", padding: "60px 64px 60px 72px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "Bricolage", fontSize: 48, letterSpacing: "-0.04em" }}>
            <OgMark size={64} tile="rgba(255,255,255,0.14)" />
            dibby
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "Bricolage", fontSize: 84, lineHeight: 0.98, letterSpacing: "-0.035em" }}>
              {TAGLINE.split(", ").map((line, i, all) => (
                <span key={line}>{i < all.length - 1 ? `${line},` : line}</span>
              ))}
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.3, marginTop: 22, opacity: 0.92 }}>From &ldquo;we should catch up&rdquo; to actually going.</div>
          </div>
          <div style={{ fontSize: 28, opacity: 0.8 }}>dibby.social</div>
        </div>

        {/* A plan card, tilted. */}
        <div style={{ display: "flex", alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 430,
              marginRight: 8,
              background: OG.white,
              color: OG.ink,
              borderRadius: 36,
              border: `4px solid ${OG.ink}`,
              boxShadow: `0 12px 0 ${OG.ink}`,
              padding: "32px 36px",
              transform: "rotate(-4deg)",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 600, color: OG.sub }}>Fri · 7 pm · Haymarket</div>
            <div style={{ fontFamily: "Bricolage", fontSize: 50, lineHeight: 1.02, letterSpacing: "-0.03em", marginTop: 10 }}>Friday dumplings</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 34 }}>
              <div style={{ display: "flex" }}>
                {CREW.map((c, i) => (
                  <div
                    key={c.m}
                    style={{ width: 64, height: 64, borderRadius: 32, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, marginLeft: i ? -12 : 0, border: `4px solid ${OG.white}` }}
                  >
                    {c.m}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", background: OG.lime, fontSize: 32, fontWeight: 800, padding: "10px 24px", borderRadius: 999, border: `3px solid ${OG.ink}` }}>4 in</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  );
}
