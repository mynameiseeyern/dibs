import { notFound, redirect } from "next/navigation";
import { Monogram } from "@/components/Monogram";
import { loadPlan } from "@/lib/viewer";
import { wrapUp } from "../bills/actions";
import * as Button from "@/components/ui/button";
import * as Checkbox from "@/components/ui/checkbox";
import { planPreview } from "@/lib/plan-preview";
import * as Alert from "@/components/ui/alert";
import { extraOn, wrapState } from "@dibs/shared/plans";
import { formatWhen } from "@/lib/time";
import { WalkIns } from "./WalkIns";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return planPreview((await params).slug, { label: "Wrap-up", path: "/wrap" });
}
export const dynamic = "force-dynamic";

export default async function Wrap({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view) notFound();
  if (!view.isHost) redirect(`/p/${slug}`);
  const billsOn = extraOn(view.plan, "bills");
  const { plan, members } = view;
  // Default ticks: whoever said they were in (or what you saved last time).
  const ticked = (m: (typeof members)[number]) => (plan.status === "wrapped" ? m.attended === true : m.rsvp === "in" && !m.waitlisted);
  const listed = members.filter((m) => m.rsvp !== "out" || m.attended);

  return (
    <form action={wrapUp.bind(null, slug)}>
      <main className="page">
        <header className="topbar">
          <Button.Root asChild variant="neutral" mode="lighter" iconOnly>
            <a href={`/p/${slug}`} aria-label="Back to the plan">
              <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
            </a>
          </Button.Root>
        </header>
        <div className="section">
          <span className="subheading-sm eyebrow">{plan.title} · wrap-up</span>
          <h1 className="title-h3">Who actually came?</h1>
          <p className="muted">
            {billsOn
              ? <>Only people you tick can be added to bills or see your PayID. Nobody paid for anything, or it&rsquo;s sorted? Pick Nothing to split.</>
              : extraOn(plan, "recap")
                ? "Tick who came. They're the ones who get the recap."
                : "Tick who came, so the plan remembers who was there."}
          </p>
        </div>
        {wrapState(plan) === "early" && plan.starts_at && (
          <Alert.Root status="information">
            <Alert.Icon as="i" className="ri-information-line" aria-hidden="true" />
            <div>
              <strong>It&rsquo;s set for {formatWhen(plan.starts_at)}</strong>
              Wrapping up now ends the plan early: voting, RSVPs and reminders stop{billsOn ? ", and it moves on to bills" : ""}.
            </div>
          </Alert.Root>
        )}
        <div className="db-card">
          <div className="people">
            {listed.map((m) => (
              <label key={m.id} className="tick">
                <Monogram name={m.display_name} colour={m.colour} />
                <span className="label-md person__name">
                  {m.display_name}
                  <small>
                    {m.role === "organiser" ? "Organiser · " : ""}
                    {!m.user_id && !m.guest_id ? "Came last minute" : m.rsvp === "in" ? "Said they were in" : m.rsvp === "maybe" ? "Said maybe" : "Didn't reply"}
                    {m.plus_one ? " · +1" : ""}
                  </small>
                </span>
                <Checkbox.Root name="came" value={m.id} defaultChecked={ticked(m)} aria-label={`${m.display_name} came`} />
              </label>
            ))}
            <WalkIns taken={members.map((m) => m.display_name)} />
          </div>
        </div>
      </main>
      <div className="dock">
        <div className="dock__inner">
          {billsOn ? (
            <>
              <Button.Root size="large" block name="next" value="bills">
                On to bills
              </Button.Root>
              <Button.Root variant="neutral" mode="lighter" size="large" block name="next" value="none">
                Nothing to split
              </Button.Root>
            </>
          ) : (
            <Button.Root size="large" block name="next" value="none">
              That&rsquo;s a wrap
            </Button.Root>
          )}
        </div>
      </div>
    </form>
  );
}
