import { notFound, redirect } from "next/navigation";
import { TZ, formatWhen } from "@/lib/time";
import { canDeletePlan, countIn, wrapState } from "@dibs/shared/plans";
import { loadPlan } from "@/lib/viewer";
import { maxVotes } from "@dibs/shared/votes";
import { cancelPlan, deletePlan, openVote, setArea, setExtra, setCategory, setDescription, setCapacity, setDibbyVolume, setMultiVote, setPlace, setPlusOnes, setTitle, setVibe, setVoteDeadline, setWhen } from "./actions";
import { store } from "@/lib/store";
import { EditPlan } from "./EditPlan";
import * as Button from "@/components/ui/button";
import { planPreview } from "@/lib/plan-preview";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return planPreview((await params).slug, { label: "Edit plan", path: "/manage" });
}

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
  if (!isHost || plan.status === "cancelled") redirect(`/p/${slug}`);
  // After wrap-up the plan itself is set; only the extras (bills, recap…) can still change.
  const wrapped = plan.status === "wrapped";
  const locked = plan.status === "locked";
  const optionCount = (await store.listOptions(plan.id)).length;
  // A plan that's the organiser's alone, no bills: Delete instead of Call it off.
  const deletable = canDeletePlan(view.me, view.members, (await store.listBills(plan.id)).length);
  const profile = view.organiser ? await store.getProfile(view.organiser.id) : null;

  return (
    <main className="page">
      <header className="topbar">
        <Button.Root asChild variant="neutral" mode="lighter" iconOnly>
          <a href={`/p/${slug}`} aria-label="Back to the plan">
            <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
          </a>
        </Button.Root>
      </header>
      <div className="section">
        <span className="subheading-sm eyebrow">{plan.title}</span>
        <h1 className="title-h3">{wrapped ? "Extras" : "Edit the plan"}</h1>
      </div>
      <EditPlan
        extrasOnly={wrapped}
        status={locked || wrapped ? "locked" : "voting"}
        askWhenHref={plan.starts_at && Date.parse(plan.starts_at) <= Date.now() ? undefined : `/p/${slug}?when=ask#when`}
        title={plan.title}
        category={plan.category ?? null}
        description={plan.description ?? null}
        savedCategories={profile?.plan_categories ?? []}
        signedIn={Boolean(view.organiser)}
        extrasOff={plan.extras_off ?? []}
        whenLabel={formatWhen(plan.starts_at)}
        deadlineLabel={formatWhen(plan.vote_deadline)}
        whenInput={toLocalInput(plan.starts_at)}
        deadlineInput={toLocalInput(plan.vote_deadline)}
        venue={plan.venue_name}
        area={plan.area}
        optionCount={optionCount}
        capacity={plan.capacity}
        going={countIn(view.members)}
        plusOnes={plan.plus_ones}
        multiVote={maxVotes(plan) > 1}
        vibe={plan.vibe}
        volume={plan.dibby_volume ?? "normal"}
        wrapEarlyHref={wrapState(plan) === "early" ? `/p/${slug}/wrap` : null}
        actions={{
          setTitle: setTitle.bind(null, slug),
          setCategory: setCategory.bind(null, slug),
          setDescription: setDescription.bind(null, slug),
          setWhen: setWhen.bind(null, slug),
          setArea: setArea.bind(null, slug),
          setVoteDeadline: setVoteDeadline.bind(null, slug),
          setCapacity: setCapacity.bind(null, slug),
          setPlusOnes: setPlusOnes.bind(null, slug),
          setMultiVote: setMultiVote.bind(null, slug),
          setExtra: setExtra.bind(null, slug),
          setPlace: setPlace.bind(null, slug),
          openVote: openVote.bind(null, slug),
          setVibe: setVibe.bind(null, slug),
          setVolume: setDibbyVolume.bind(null, slug),
          cancel: cancelPlan.bind(null, slug),
          remove: deletable ? deletePlan.bind(null, slug) : undefined,
        }}
      />
    </main>
  );
}
