import { notFound, redirect } from "next/navigation";
import { TZ } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { cancelPlan, setDibbyVolume, updateDetails } from "./actions";
import { ManageForm } from "./ManageForm";

export const metadata = { title: "Edit plan" };

const VOLUME_LABEL = { quiet: "Quiet", normal: "Normal", loud: "Loud" } as const;
const VOLUME_HINT = {
  quiet: "Just the useful stuff: vote closing, the day before, and wrapping up. One a day at most.",
  normal: "Also chases replies and maybes, and says when someone pulls out. Up to three a day.",
  loud: "Everything Normal does, up to five a day.",
} as const;
export const dynamic = "force-dynamic";

/** ISO -> "2026-10-23T19:00" in Sydney time, for the datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function Manage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view) notFound();
  const { plan, isHost } = view;
  if (!isHost || plan.status === "cancelled" || plan.status === "wrapped") redirect(`/p/${slug}`);
  const locked = plan.status === "locked";

  return (
    <main className="page">
      <header className="topbar">
        <a className="db-btn db-btn--secondary db-btn--icon" href={`/p/${slug}`} aria-label="Back to the plan">
          <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
        </a>
      </header>
      <div className="section">
        <span className="subheading-sm eyebrow">{plan.title}</span>
        <h1 className="title-h3">Edit the plan</h1>
      </div>
      <ManageForm
        action={updateDetails.bind(null, slug)}
        cancel={cancelPlan.bind(null, slug)}
        placeLabel={locked ? "Where" : "Where-ish"}
        initial={{ title: plan.title, startsAt: toLocalInput(plan.starts_at), place: (locked ? plan.venue_name : plan.area) ?? "" }}
      />
      <section className="db-card section" aria-labelledby="dibby-volume-h">
        <h2 id="dibby-volume-h" className="title-h4">How chatty is Dibby?</h2>
        <p className="paragraph-sm muted">{VOLUME_HINT[plan.dibby_volume ?? "normal"]}</p>
        <div className="rsvp" role="group" aria-label="How chatty is Dibby?">
          {(["quiet", "normal", "loud"] as const).map((v) => (
            <form key={v} action={setDibbyVolume.bind(null, slug, v)}>
              <button className={`db-btn ${plan.dibby_volume === v ? "db-btn--primary" : "db-btn--secondary"}`} aria-pressed={plan.dibby_volume === v}>
                {VOLUME_LABEL[v]}
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
