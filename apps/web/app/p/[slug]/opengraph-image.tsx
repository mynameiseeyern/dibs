import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { countIn, monogram } from "@dibs/shared/plans";
import { store } from "@/lib/store";
import { formatWhen } from "@/lib/time";

// The WhatsApp / iMessage preview card. The share link carries ?v=<version>, so a changed
// plan gets a fresh card instead of WhatsApp's cached one.
export const alt = "dibs plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FILL: Record<string, string> = { violet: "#DCD3FF", lime: "#C8F03C", sun: "#FFE7A8", mint: "#BDF2D5", tangerine: "#FFD1BD", sky: "#C9E0FF", coral: "#FFC4CF", rose: "#FFD0E6", aqua: "#BFF0F5", ivory: "#F3EEE4" };
const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await store.getPlanBySlug(slug);
  const members = plan ? await store.listMembers(plan.id) : [];
  const going = members.filter((m) => m.rsvp === "in" && !m.waitlisted).slice(0, 5);
  const facts = plan ? [formatWhen(plan.starts_at), plan.venue_name ?? plan.area].filter(Boolean).join(" · ") : "";
  const status = plan?.status === "cancelled" ? "Called off" : `${plan ? countIn(members) : 0} in`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#6D4AFF", color: "#fff", padding: "64px 72px", fontFamily: "Figtree" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Bricolage", fontSize: 44, letterSpacing: "-0.04em" }}>
          <svg width="56" height="56" viewBox="0 0 200 200">
            <rect width="200" height="200" rx="48" fill="#FFFFFF" fillOpacity="0.14" />
            <circle cx="62" cy="118" r="22" fill="#FFFFFF" fillOpacity="0.55" />
            <circle cx="138" cy="118" r="22" fill="#FFFFFF" fillOpacity="0.55" />
            <circle cx="100" cy="82" r="26" fill="#C8F03C" />
            <rect x="92" y="114" width="16" height="36" rx="8" fill="#C8F03C" />
          </svg>
          dibs
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Bricolage", fontSize: plan && plan.title.length > 22 ? 76 : 96, lineHeight: 1, letterSpacing: "-0.03em" }}>{plan?.title ?? "A plan on dibs"}</div>
          {facts && <div style={{ fontSize: 38, marginTop: 20, opacity: 0.92 }}>{facts}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex" }}>
            {going.map((m, i) => (
              <div key={m.id} style={{ width: 76, height: 76, borderRadius: 38, background: FILL[m.colour] ?? "#DCD3FF", color: "#141216", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, marginLeft: i ? -14 : 0, border: "5px solid #6D4AFF" }}>
                {monogram(m.display_name)}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", background: plan?.status === "cancelled" ? "#FFFFFF" : "#C8F03C", color: "#141216", fontSize: 40, fontWeight: 800, padding: "16px 30px", borderRadius: 999, border: "3px solid #141216", boxShadow: "0 6px 0 #141216" }}>
            {status}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: await font("bricolage-grotesque-latin-800-normal.woff"), weight: 800 },
        { name: "Figtree", data: await font("figtree-latin-600-normal.woff"), weight: 600 },
        { name: "Figtree", data: await font("figtree-latin-800-normal.woff"), weight: 800 },
      ],
    }
  );
}
