import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countIn, RSVP_LABEL, shareText } from "@dibs/shared/plans";
import type { PlanMember, Rsvp } from "@dibs/shared/types";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { Monogram, MonogramStack } from "@/components/Monogram";
import { LiveRefresh } from "@/components/LiveRefresh";
import { mapsLink } from "@/lib/places";
import { closeIfDue } from "@/lib/plan-ops";
import { store } from "@/lib/store";
import { formatShort, formatWhen } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { addOption, joinPlan, lockPlan, postMessage, removeMe, setRsvp, vote } from "./actions";
import { JoinForm } from "./JoinForm";
import { ShareButton } from "./ShareButton";
import { Thread } from "./Thread";
import { VoteList } from "./Vote";
import { siteUrl } from "@/lib/site";

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
  let view = await loadPlan(slug);
  if (!view) notFound();
  // Votes close themselves once the deadline passes.
  if (await closeIfDue(view.plan)) view = (await loadPlan(slug))!;
  const { plan, members, me, isHost } = view;
  const [options, votes, messages] = await Promise.all([store.listOptions(plan.id), store.listVotes(plan.id), store.listMessages(plan.id, 50)]);
  const voteRows = options.map((o) => ({ ...o, votes: votes.filter((v) => v.option_id === o.id).length, mine: Boolean(me && votes.some((v) => v.option_id === o.id && v.member_id === me.id)) }));
  const started = plan.starts_at ? Date.parse(plan.starts_at) < Date.now() : false;

  const site = siteUrl();
  const url = `${site}/p/${plan.slug}?v=${plan.version}`;
  const going = members.filter((m) => m.rsvp === "in" && !m.waitlisted);
  const inCount = countIn(members);
  const when = formatWhen(plan.starts_at);
  const cancelled = plan.status === "cancelled";
  const full = inCount >= plan.capacity;

  return (
    <>
      <LiveRefresh />
      <main className="page">
        <header className="topbar">
          <Wordmark href={view.here.name ? "/home" : "/"} />
          <div className="topbar__end">
            {isHost && !cancelled && plan.status !== "wrapped" && (
            <a className="db-btn db-btn--secondary db-btn--sm" href={`/p/${slug}/manage`}>
              <i className="ri-edit-line db-icon" aria-hidden="true" />
              Edit
            </a>
            )}
            <AccountButton here={view.here} />
          </div>
        </header>

        {cancelled && (
          <div className="db-alert db-alert--warning" role="status">
            <i className="ri-close-circle-fill db-icon" aria-hidden="true" />
            <div>
              <strong>Called off</strong>
              {plan.updated_note ?? "This one's not happening."} Nobody owes anything for it.
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
          <h1 className="title-h3 plan-title">{plan.title}</h1>
          <ul className="db-plan__facts">
            {when && (
              <li>
                <i className="ri-calendar-line db-icon" aria-hidden="true" /> {when}
              </li>
            )}
            {(plan.venue_name || plan.area) && (
              <li>
                <i className="ri-map-pin-line db-icon" aria-hidden="true" />{" "}
                {plan.venue_name ? (
                  <a href={mapsLink(plan.venue_place_id, plan.venue_name)} target="_blank" rel="noreferrer">{plan.venue_name}</a>
                ) : (
                  plan.area
                )}
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
            <JoinForm action={joinPlan.bind(null, slug)} signedIn={view.here.canOrganise} slug={slug} />
          </section>
        )}

        {me && !cancelled && (
          <section className="section" aria-labelledby="rsvp-h">
            <h2 id="rsvp-h" className="subheading-sm eyebrow">You</h2>
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
              <p className="paragraph-sm muted" role="status">
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

        {plan.status === "wrapped" && (
          <div className="wrap-links">
            <a className="db-card db-card--violet section link-card" href={`/p/${slug}/bills`}>
              <strong className="title-h4">Square up</strong>
              <span>{me?.attended ? "See what you owe, or add what you paid." : "Bills are for people who came."}</span>
            </a>
            {me?.attended && (
              <a className="db-card section link-card" href={`/p/${slug}/recap`}>
                <strong className="title-h4">The recap</strong>
                <span className="muted">Rate the night, best moment, MVP.</span>
              </a>
            )}
          </div>
        )}
        {me?.role === "organiser" && plan.status === "locked" && (
          <a className="db-btn db-btn--secondary db-btn--block" href={`/p/${slug}/wrap`}>
            <i className="ri-flag-line db-icon" aria-hidden="true" />{started ? "Wrap it up: who came?" : "After the night: wrap it up"}
          </a>
        )}

        {(plan.status === "voting" || options.length > 0) && !cancelled && (
          <section className="section" aria-labelledby="vote-h">
            <div className="section__head">
              <h2 id="vote-h" className="subheading-sm eyebrow">{plan.status === "voting" ? "What's the move?" : "The vote"}</h2>
              {plan.status === "voting" && <span className="paragraph-sm muted">{new Set(votes.map((v) => v.member_id)).size} of {members.length} voted</span>}
            </div>
            <VoteList rows={voteRows} canVote={Boolean(me)} open={plan.status === "voting"} vote={vote.bind(null, slug)} add={addOption.bind(null, slug)} />
            {isHost && plan.status === "voting" && options.length > 0 && (
              <form action={lockPlan.bind(null, slug)}>
                <button className="db-btn db-btn--ghost db-btn--sm"><i className="ri-lock-2-line db-icon" aria-hidden="true" />Lock it in now</button>
              </form>
            )}
          </section>
        )}

        {!cancelled && (
          <Thread messages={messages} members={members} meId={me?.id ?? null} canPost={Boolean(me?.user_id)} post={postMessage.bind(null, slug)} />
        )}

        <section className="section" aria-labelledby="who-h">
          <div className="section__head">
            <h2 id="who-h" className="subheading-sm eyebrow">Who's coming</h2>
            <span className="paragraph-sm muted">
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
                      <span className="label-md person__name">
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

        {me?.guest_id && !view.organiser && (
          <a className="db-alert db-alert--information link-card" href="/account">
            <i className="ri-smartphone-line db-icon" aria-hidden="true" />
            <div>
              <strong>On another phone too?</strong>
              Add your email and this plan comes with you to any browser.
            </div>
          </a>
        )}

        {me?.role === "guest" && view.guest && me.guest_id === view.guest.id && (
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
