import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countIn, RSVP_LABEL, shareText } from "@dibs/shared/plans";
import type { PlanMember, Rsvp } from "@dibs/shared/types";
import { Wordmark } from "@/components/Logo";
import { Monogram, MonogramStack } from "@/components/Monogram";
import { formatShort, formatWhen } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { joinPlan, removeMe, setRsvp } from "./actions";
import { JoinForm } from "./JoinForm";
import { ShareButton } from "./ShareButton";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await loadPlan((await params).slug);
  if (!view) return { title: "Plan not found" };
  const when = formatWhen(view.plan.starts_at);
  return {
    title: view.plan.title,
    description: [when, view.plan.venue_name ?? view.plan.area, `${countIn(view.members)} in`].filter(Boolean).join(" · "),
  };
}

const ORDER: (Rsvp | "waitlist" | "none")[] = ["in", "maybe", "waitlist", "none", "out"];
const GROUP_LABEL = { in: "Going", maybe: "Maybe", waitlist: "Waitlist", none: "Hasn't said yet", out: "Can't make it" } as const;
const groupOf = (m: PlanMember) => (m.waitlisted ? "waitlist" : m.rsvp ?? "none");

export default async function PlanPage({ params }: Props) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view) notFound();
  const { plan, members, me, isHost } = view;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${site}/p/${plan.slug}?v=${plan.version}`;
  const going = members.filter((m) => m.rsvp === "in" && !m.waitlisted);
  const inCount = countIn(members);
  const when = formatWhen(plan.starts_at);
  const cancelled = plan.status === "cancelled";
  const full = inCount >= plan.capacity;

  return (
    <>
      <main className="page">
        <header className="topbar">
          <Wordmark />
          {me && <span className="db-badge db-badge--primary">{me.role === "guest" ? "You're on this plan" : "You're hosting"}</span>}
        </header>

        {cancelled && (
          <div className="db-alert db-alert--warning" role="status">
            <i className="ri-close-circle-fill db-icon" aria-hidden="true" />
            <div>
              <strong>Called off</strong>
              This one's not happening. The host might set up a new one.
            </div>
          </div>
        )}
        {!cancelled && plan.updated_note && (
          <div className="db-alert db-alert--information" role="status">
            <i className="ri-refresh-fill db-icon" aria-hidden="true" />
            <div>
              <strong>Updated</strong>
              {plan.updated_note}
            </div>
          </div>
        )}

        <article className={`db-card db-plan${cancelled ? "" : " db-card--sticker"}`}>
          <span className="db-plan__eyebrow">{plan.status === "voting" ? "Plan · voting open" : plan.status === "locked" ? "Plan · locked in" : "Plan"}</span>
          <h1 className="db-plan__title plan-title">{plan.title}</h1>
          <ul className="db-plan__facts">
            {when && (
              <li>
                <i className="ri-calendar-line db-icon" aria-hidden="true" /> {when}
              </li>
            )}
            {(plan.venue_name || plan.area) && (
              <li>
                <i className="ri-map-pin-line db-icon" aria-hidden="true" /> {plan.venue_name ?? plan.area}
              </li>
            )}
            {plan.status === "voting" && plan.vote_deadline && (
              <li>
                <i className="ri-time-line db-icon" aria-hidden="true" /> Vote closes {formatShort(plan.vote_deadline)}
              </li>
            )}
          </ul>
          <div className="db-plan__foot">
            <MonogramStack people={going} />
            <span className="db-badge db-badge--accent">
              {inCount} in{full ? " · full" : ""}
            </span>
          </div>
        </article>

        {!me && !cancelled && (
          <section className="section db-card" aria-labelledby="join-h">
            <h2 id="join-h" className="title-h4">You coming?</h2>
            <JoinForm action={joinPlan.bind(null, slug)} signedIn={Boolean(view.organiser)} />
          </section>
        )}

        {me && !cancelled && (
          <section className="section" aria-labelledby="rsvp-h">
            <h2 id="rsvp-h" className="eyebrow">You</h2>
            <div className="rsvp" role="group" aria-label="Are you in?">
              {(["in", "maybe", "out"] as const).map((r) => (
                <form key={r} action={setRsvp.bind(null, slug, r)}>
                  {r === "in" && plan.plus_ones && <input type="hidden" name="plus_one" value={me.plus_one ? "on" : ""} />}
                  <button
                    className={`db-btn ${me.rsvp === r ? (r === "in" ? "db-btn--dibs" : "db-btn--primary") : "db-btn--secondary"}`}
                    aria-pressed={me.rsvp === r}
                  >
                    {RSVP_LABEL[r]}
                  </button>
                </form>
              ))}
            </div>
            {me.waitlisted && (
              <p className="notice muted" role="status">
                It's full, so you're on the waitlist. The host will let you know if a spot opens up.
              </p>
            )}
            {me.rsvp === "in" && !me.waitlisted && me.role === "guest" && (
              <div className="db-alert db-alert--information">
                <i className="ri-smartphone-line db-icon" aria-hidden="true" />
                <div>
                  <strong>You're in. Nice.</strong>
                  Get the dibs app to see your plans in one place. Coming soon to the App Store.
                </div>
              </div>
            )}
          </section>
        )}

        <section className="section" aria-labelledby="who-h">
          <div className="section__head">
            <h2 id="who-h" className="eyebrow">Who's coming</h2>
            <span className="small muted">
              {inCount} of {plan.capacity}
            </span>
          </div>
          <div className="db-card">
            <ul className="people">
              {ORDER.flatMap((g) =>
                members
                  .filter((m) => groupOf(m) === g)
                  .map((m) => (
                    <li key={m.id} className="person">
                      <Monogram name={m.display_name} colour={m.colour} />
                      <span className="person__name">
                        {m.display_name}
                        {m.id === me?.id ? " (you)" : ""}
                        <small>
                          {m.role === "organiser" ? "Organiser · " : m.role === "cohost" ? "Co-host · " : ""}
                          {GROUP_LABEL[g]}
                          {m.plus_one ? " · +1" : ""}
                        </small>
                      </span>
                    </li>
                  ))
              )}
            </ul>
          </div>
        </section>

        {me?.role === "guest" && view.guest && (
          <form action={removeMe.bind(null, slug)}>
            <button className="db-btn db-btn--ghost db-btn--sm">Remove me from this plan</button>
          </form>
        )}
      </main>

      {!cancelled && isHost && (
        <div className="dock">
          <div className="dock__inner">
            <ShareButton
              title={plan.title}
              url={url}
              text={shareText({ title: plan.title, deadline: plan.status === "voting" ? formatShort(plan.vote_deadline) : null, url })}
            />
          </div>
        </div>
      )}
    </>
  );
}
