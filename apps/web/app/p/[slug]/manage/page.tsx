import { notFound, redirect } from "next/navigation";
import { TZ } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { cancelPlan, updateDetails } from "./actions";
import { ManageForm } from "./ManageForm";

export const metadata = { title: "Edit plan" };
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
        <span className="eyebrow">{plan.title}</span>
        <h1 className="title-h3">Edit the plan</h1>
      </div>
      <ManageForm
        action={updateDetails.bind(null, slug)}
        cancel={cancelPlan.bind(null, slug)}
        placeLabel={locked ? "Where" : "Where-ish"}
        initial={{ title: plan.title, startsAt: toLocalInput(plan.starts_at), place: (locked ? plan.venue_name : plan.area) ?? "" }}
      />
    </main>
  );
}
