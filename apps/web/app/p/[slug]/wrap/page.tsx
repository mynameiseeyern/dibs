import { notFound, redirect } from "next/navigation";
import { Monogram } from "@/components/Monogram";
import { loadPlan } from "@/lib/viewer";
import { wrapUp } from "../bills/actions";
import * as Button from "@/components/ui/button";
import * as Checkbox from "@/components/ui/checkbox";

export const metadata = { title: "Wrap-up" };
export const dynamic = "force-dynamic";

export default async function Wrap({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view) notFound();
  if (view.me?.role !== "organiser") redirect(`/p/${slug}`);
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
          <p className="muted">Only people you tick can be added to bills or see your PayID.</p>
        </div>
        <div className="db-card">
          <div className="people">
            {listed.map((m) => (
              <label key={m.id} className="tick">
                <Monogram name={m.display_name} colour={m.colour} />
                <span className="label-md person__name">
                  {m.display_name}
                  <small>
                    {m.role === "organiser" ? "Organiser · " : ""}
                    {m.rsvp === "in" ? "Said they were in" : m.rsvp === "maybe" ? "Said maybe" : "Didn't reply"}
                    {m.plus_one ? " · +1" : ""}
                  </small>
                </span>
                <Checkbox.Root name="came" value={m.id} defaultChecked={ticked(m)} aria-label={`${m.display_name} came`} />
              </label>
            ))}
          </div>
        </div>
      </main>
      <div className="dock">
        <div className="dock__inner">
          <Button.Root size="large" block>On to bills</Button.Root>
        </div>
      </div>
    </form>
  );
}
