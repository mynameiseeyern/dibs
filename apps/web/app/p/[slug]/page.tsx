import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countIn, planAccess, READ_ONLY_NOTE, shareText } from "@dibs/shared/plans";
import { formatAud } from "@dibs/shared/bills";
import type { PlanMember, Rsvp } from "@dibs/shared/types";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { Suspense } from "react";
import { Weather } from "./Weather";
import { PlanTabs } from "./PlanTabs";
import { RsvpPicker } from "./RsvpPicker";
import { AddToCalendar } from "./AddToCalendar";
import { canAddToCalendar, googleCalendarLink, outlookCalendarLink } from "@/lib/calendar";
import { Once } from "@/components/moments/Once";
import { planStatus } from "@/lib/status";
import { Monogram, MonogramStack } from "@/components/Monogram";
import { LiveRefresh } from "@/components/LiveRefresh";
import { mapsLink } from "@/lib/places";
import { closeIfDue } from "@/lib/plan-ops";
import { nudgeIfDue } from "@/lib/nudges";
import { owedToYou, youOwe } from "@/lib/copy";
import { store } from "@/lib/store";
import { formatShort, formatWhen } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { addOption, askDibbyMore, joinPlan, lockPlan, postMessage, removeMe, removeOption, setRsvp, toggleDibbyMute, toggleReaction, vote } from "./actions";
import { setPlace } from "./manage/actions";
import { JoinForm } from "./JoinForm";
import { ShareButton } from "./ShareButton";
import { Thread } from "./Thread";
import { VoteList } from "./Vote";
import { siteUrl } from "@/lib/site";
import * as Button from "@/components/ui/button";
import * as Badge from "@/components/ui/badge";
import * as Alert from "@/components/ui/alert";

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
  // Going (or hosting): take part. Maybe, not replied, waitlisted: read along. Can't go: hidden.
  const access = me ? planAccess(me) : null;
  const readOnly = access?.level === "read" ? READ_ONLY_NOTE[access.why] : null;
  const [options, votes, firstMessages] = await Promise.all([store.listOptions(plan.id), store.listVotes(plan.id), store.listMessages(plan.id, 50)]);
  // Dibby's automatic nudges are checked on page load (we're on Vercel Hobby: no frequent cron).
  const messages = (await nudgeIfDue(plan, members, options, votes)) ? await store.listMessages(plan.id, 50) : firstMessages;
  const reactions = await store.listReactions(plan.id);
  // A typed-in option's address (its note) is only for people in the plan.
  const voteRows = options.map((o) => ({ ...o, note: o.place_id || me ? o.note : null, votes: votes.filter((v) => v.option_id === o.id).length, mine: Boolean(me && votes.some((v) => v.option_id === o.id && v.member_id === me.id)) }));
  const started = plan.starts_at ? Date.parse(plan.starts_at) < Date.now() : false;

  const site = siteUrl();
  const url = `${site}/p/${plan.slug}?v=${plan.version}`;
  const going = members.filter((m) => m.rsvp === "in" && !m.waitlisted);
  const inCount = countIn(members);
  const when = formatWhen(plan.starts_at);
  const cancelled = plan.status === "cancelled";
  const full = inCount >= plan.capacity;
  const wrapped = plan.status === "wrapped";
  // After the night, Who came is just the people ticked at wrap-up.
  const came = members.filter((m) => m.attended);

  // After the night: where the money's at, and what the crew said.
  const [bills, shares, recap] = wrapped ? await Promise.all([store.listBills(plan.id), store.listShares(plan.id), store.listRecap(plan.id)]) : [[], [], []];
  const payerOf = new Map(bills.map((b) => [b.id, b.payer_member_id]));
  const owed = shares.filter((x) => x.amount_cents > 0 && x.member_id !== payerOf.get(x.bill_id));
  const open = owed.filter((x) => x.status !== "confirmed");
  const unspun = bills.some((b) => b.split_mode === "roulette" && !b.roulette_loser_id);
  const allSquare = bills.length > 0 && open.length === 0 && !unspun;
  const iOwe = me ? open.filter((x) => x.member_id === me.id).reduce((n, x) => n + x.amount_cents, 0) : 0;
  const owedToMe = me ? open.filter((x) => payerOf.get(x.bill_id) === me.id).reduce((n, x) => n + x.amount_cents, 0) : 0;
  const rated = recap.filter((a) => a.stars);
  const avgStars = rated.length ? rated.reduce((n, a) => n + (a.stars ?? 0), 0) / rated.length : null;
  const mvpVotes = new Map<string, number>();
  for (const a of recap) if (a.mvp_member_id) mvpVotes.set(a.mvp_member_id, (mvpVotes.get(a.mvp_member_id) ?? 0) + 1);
  const mvpId = [...mvpVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const firstName = (id: string | undefined) => members.find((m) => m.id === id)?.display_name.split(" ")[0];
  const moment = recap.find((a) => a.best_moment)?.best_moment;
  const iAnswered = Boolean(me && recap.some((a) => a.member_id === me.id));

  const baseStatus = planStatus(plan);
  const status = wrapped && allSquare ? { ...baseStatus, label: "Wrapped · all square", tone: "success" as const, icon: "ri-check-double-line" } : baseStatus;
  const voters = new Set(votes.map((v) => v.member_id)).size;

  return (
    <>
      <LiveRefresh />
      <main className="page">
        <header className="topbar">
          <Wordmark href={view.here.name ? "/home" : "/"} />
          <div className="topbar__end">
            {isHost && !cancelled && plan.status !== "wrapped" && (
            <Button.Root asChild variant="neutral" mode="lighter" size="small">
              <a href={`/p/${slug}/manage`}>
                <i className="ri-edit-line db-icon" aria-hidden="true" />
                Edit
              </a>
            </Button.Root>
            )}
            <AccountButton here={view.here} />
          </div>
        </header>

        <article className={`db-card db-plan${cancelled ? "" : " db-card--sticker"}`}>
          <div className="plan-card__top">
            <Badge.Root color={status.tone}>
              <Badge.Icon as="i" className={status.icon} aria-hidden="true" />
              {status.label}
            </Badge.Root>
          </div>
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
                {plan.venue_name && plan.venue_place_id ? (
                  <a href={mapsLink(plan.venue_place_id, plan.venue_name)} target="_blank" rel="noreferrer">{plan.venue_name}</a>
                ) : plan.venue_name ? (
                  // Typed in: the address is only for people in the plan.
                  me && plan.venue_address ? (
                    <span>
                      {plan.venue_name} ·{" "}
                      <a href={mapsLink(null, plan.venue_address)} target="_blank" rel="noreferrer">{plan.venue_address}</a>
                    </span>
                  ) : (
                    plan.venue_name
                  )
                ) : (
                  plan.area
                )}
              </li>
            )}
            {!cancelled && (
              <Suspense fallback={null}>
                <Weather plan={plan} />
              </Suspense>
            )}
          </ul>
          {me && canAddToCalendar(plan) && plan.status === "locked" && (
            <AddToCalendar
              links={{
                ics: `/p/${slug}/calendar`,
                google: googleCalendarLink(plan, `${siteUrl()}/p/${slug}`),
                outlook: outlookCalendarLink(plan, `${siteUrl()}/p/${slug}`),
                office: outlookCalendarLink(plan, `${siteUrl()}/p/${slug}`, true),
              }}
            />
          )}
          {(cancelled || (plan.updated_note && !wrapped)) && (
            <p className={`label-sm plan-card__note${cancelled ? " plan-card__note--off" : ""}`} role="status">
              <i className={`${cancelled ? "ri-close-circle-line" : "ri-refresh-line"} db-icon`} aria-hidden="true" />
              <span>
                {cancelled ? `${plan.updated_note ?? "This one's not happening."} Nobody owes anything for it.` : `Updated: ${plan.updated_note}`}
              </span>
            </p>
          )}
          {!wrapped && (
          <div className="db-plan__foot">
            <MonogramStack people={going} />
            <Badge.Root color="accent">
              {inCount} in{full ? " · full" : ""}
            </Badge.Root>
          </div>
          )}
        </article>

        {/* Your move: the one thing to do now. */}
        {!cancelled && !me && (
          <section className="section db-card" aria-labelledby="join-h">
            <h2 id="join-h" className="title-h4">You coming?</h2>
            <JoinForm action={joinPlan.bind(null, slug)} signedIn={view.here.canOrganise} slug={slug} />
          </section>
        )}

        {wrapped && me?.attended && (
          <section className="wrap-links" aria-label="After the night">
            {/* Money first while it's open; once everyone's square, the night comes first and bills become history. */}
            {/* "Nothing to split" at wrap-up: no money card unless someone adds a bill anyway. */}
            {!allSquare && !(plan.no_bills && bills.length === 0) && (
            <a className="db-card db-card--violet section link-card" href={`/p/${slug}/bills`}>
              <strong className="title-h4">Square up</strong>
              <span>
                {iOwe > 0
                  ? youOwe(plan.vibe, formatAud(iOwe))
                  : owedToMe > 0
                    ? owedToYou(plan.vibe, formatAud(owedToMe))
                    : bills.length === 0
                      ? "Paid for something? Add it and dibs does the maths."
                      : `${owed.length - open.length} of ${owed.length} settled.`}
              </span>
            </a>
            )}
            <a className={`db-card section link-card recap-teaser${!iAnswered ? " recap-teaser--ask" : ""}`} href={`/p/${slug}/recap`}>
              <span className="subheading-sm eyebrow">The recap</span>
              {recap.length === 0 ? (
                <strong className="title-h4">How was it? Rate the night.</strong>
              ) : (
                <>
                  <div className="recap-teaser__stats">
                    {avgStars !== null && (
                      <span className="title-h4">
                        {avgStars.toFixed(1)}
                        <i className="ri-star-fill db-icon" aria-hidden="true" />
                      </span>
                    )}
                    {mvpId && <span className="label-md">MVP: {firstName(mvpId)}</span>}
                  </div>
                  {moment && <q className="paragraph-sm recap-teaser__moment">{moment}</q>}
                </>
              )}
              <span className="label-sm recap-teaser__cta">
                {iAnswered ? "See what everyone said" : recap.length ? "Add yours" : "Stars, best moment, MVP"}
                <i className="ri-arrow-right-line db-icon" aria-hidden="true" />
              </span>
            </a>
            {plan.no_bills && bills.length === 0 && (
              <a className="history-link" href={`/p/${slug}/bills?add=1`}>
                <i className="ri-receipt-line db-icon" aria-hidden="true" />
                <span className="label-sm">Paid for something after all?</span>
                <span className="paragraph-sm muted">Add a bill</span>
              </a>
            )}
            {allSquare && (
              <a className="history-link" href={`/p/${slug}/bills`}>
                <i className="ri-check-double-line db-icon" aria-hidden="true" />
                <span className="label-sm">Bills · everyone&rsquo;s square</span>
                <span className="paragraph-sm muted">See history</span>
              </a>
            )}
          </section>
        )}
        {wrapped && me && !me.attended && (
          <p className="paragraph-sm muted">The bills and recap are just for people who came. Catch you at the next one.</p>
        )}

        {me && !cancelled && plan.status !== "wrapped" && (
          <section className="db-card section" aria-labelledby="rsvp-h">
            {me.rsvp === "in" && !me.waitlisted && me.role !== "organiser" && (
              <Once id={`in:${plan.id}:${me.id}`} kind="pop" size={140} colour={me.colour} label="You popped up. You're in." />
            )}
            {plan.status === "locked" && (
              <Once id={`locked:${plan.id}`} kind="lock" size={150} label={`Locked in: ${plan.venue_name ?? "the plan"}`} />
            )}
            {me.role === "organiser" ? (
              // Hosts are always going: no RSVP to make on your own plan. Can't make it any more? That's a change to the plan, not an RSVP.
              <>
                <h2 id="rsvp-h" className="label-md">
                  You&rsquo;re hosting this one
                </h2>
                <p className="paragraph-sm muted">
                  You&rsquo;re counted as going. Can&rsquo;t make it any more?{" "}
                  <a href={`/p/${slug}/manage`}>
                    Change the plan
                  </a>
                  .
                </p>
              </>
            ) : (
              <RsvpPicker
                rsvp={me.rsvp ?? null}
                waitlisted={me.waitlisted}
                plusOne={me.plus_one}
                plusOnes={plan.plus_ones}
                setRsvp={setRsvp.bind(null, slug)}
                vibe={plan.vibe}
              />
            )}
            {me.rsvp === "in" && !me.waitlisted && !isHost && (
              <ShareButton
                quiet
                label="Tell the group"
                title={plan.title}
                url={url}
                text={`I'm in for ${plan.title}! ${inCount} going so far 👉 ${url}`}
              />
            )}
            {me.rsvp === "in" && !me.waitlisted && me.role === "guest" && (
              <p className="paragraph-sm muted">Get the dibs app to see all your plans in one place. Coming soon to the App Store.</p>
            )}
            {me.role === "organiser" && plan.status === "locked" && (
              <Button.Root asChild mode={started ? "filled" : "ghost"} block>
                <a href={`/p/${slug}/wrap`}>
                  <i className="ri-flag-line db-icon" aria-hidden="true" />
                  {started ? "Wrap it up: who came?" : "After the night: wrap it up"}
                </a>
              </Button.Root>
            )}
          </section>
        )}

        {!cancelled && access?.level === "hidden" && (
          <section className="db-card section" aria-labelledby="hidden-h">
            <h2 id="hidden-h" className="title-h5">You said you can&rsquo;t make it</h2>
            <p className="paragraph-sm muted">
              So the vote, chat and who&rsquo;s in are hidden. Changed your mind? Tap I&rsquo;m in or Maybe above.
            </p>
          </section>
        )}

        {!cancelled && access?.level !== "hidden" && (
          <>
            {readOnly && (
              <Alert.Root status="information">
                <Alert.Icon as="i" className="ri-eye-line" aria-hidden="true" />
                <div>{readOnly}</div>
              </Alert.Root>
            )}
            <PlanTabs
              storageKey={`dibs:tab:${plan.id}`}
              initial={plan.status === "voting" ? "vote" : wrapped ? "chat" : "who"}
              tabs={[
                ...(!wrapped && (plan.status === "voting" || options.length > 0)
                  ? [
                      {
                        id: "vote",
                        label: plan.status === "voting" ? "Vote" : "The vote",
                        panel: (
                          <>
                            <div className="section__head">
                              <h2 className="sr-only">{plan.status === "voting" ? "What's the move?" : "The vote"}</h2>
                              <span className="paragraph-sm muted">
                                {plan.status === "voting"
                                  ? `${voters} of ${members.length} voted · closes ${formatShort(plan.vote_deadline)}`
                                  : `Locked in: ${plan.venue_name ?? "the winner"}`}
                              </span>
                            </div>
                            <VoteList
                              rows={voteRows}
                              canVote={Boolean(me)}
                              open={plan.status === "voting"}
                              vote={vote.bind(null, slug)}
                              add={addOption.bind(null, slug)}
                              remove={me ? removeOption.bind(null, slug) : undefined}
                              canRemoveAll={isHost}
                              meId={me?.id ?? null}
                              readOnly={readOnly}
                              area={plan.area}
                              askDibby={me && process.env.ANTHROPIC_API_KEY ? askDibbyMore.bind(null, slug) : undefined}
                              decide={isHost ? setPlace.bind(null, slug) : undefined}
                            />
                            {isHost && plan.status === "voting" && options.length > 0 && (
                              <form action={lockPlan.bind(null, slug)}>
                                <Button.Root mode="ghost" size="small">
                                  <i className="ri-lock-2-line db-icon" aria-hidden="true" />
                                  Lock it in now
                                </Button.Root>
                              </form>
                            )}
                          </>
                        ),
                      },
                    ]
                  : []),
                {
                  id: "chat",
                  label: "Chat",
                  count: messages.filter((m) => m.kind !== "system").length || undefined,
                  panel: (
                    <>
                      <Thread
                        messages={me?.dibby_muted ? messages.filter((m) => !m.auto) : messages}
                        vibe={plan.vibe}
                        reactions={reactions}
                        react={me?.user_id && !readOnly ? toggleReaction.bind(null, slug) : undefined}
                        summary={[plan.title, when, plan.venue_name ?? plan.area, `${inCount} going`].filter(Boolean).join(" · ")}
                        members={members}
                        meId={me?.id ?? null}
                        canPost={Boolean(me?.user_id)}
                        readOnly={readOnly}
                        post={postMessage.bind(null, slug)}
                      />
                      {me && !wrapped && (
                        <form action={toggleDibbyMute.bind(null, slug)} className="dibby-mute">
                          <Button.Root mode="ghost" aria-pressed={me.dibby_muted}>
                            <i className={`${me.dibby_muted ? "ri-notification-3-line" : "ri-notification-off-line"} db-icon`} aria-hidden="true" />
                            {me.dibby_muted ? "Show Dibby's nudges" : "Mute Dibby's nudges"}
                          </Button.Root>
                        </form>
                      )}
                    </>
                  ),
                },
                {
                  id: "who",
                  label: wrapped ? "Who came" : "Who's in",
                  count: (wrapped ? came.length : inCount) || undefined,
                  panel: (
                    <>
                      <h2 className="sr-only">Who's coming</h2>
                      {!wrapped && (
                        <p className="paragraph-sm muted">
                          {inCount} of {plan.capacity} spots taken
                        </p>
                      )}
                      <div className="db-card">
                        <ul className="people">
                          {wrapped && came.map((m) => (
                            <li key={m.id} className="person">
                              <Monogram name={m.display_name} colour={m.colour} />
                              <span className="label-md person__name">
                                {m.display_name}
                                {m.id === me?.id ? " (you)" : ""}
                                <small>{m.role === "organiser" ? "Organiser" : m.role === "cohost" ? "Co-host" : "Came"}</small>
                              </span>
                            </li>
                          ))}
                          {!wrapped && ORDER.flatMap((g) =>
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
                    </>
                  ),
                },
              ]}
            />
          </>
        )}

        {me?.guest_id && view.guest && me.guest_id === view.guest.id && (
          <footer className="plan-foot">
            {!view.organiser && (
              <a className="label-sm" href="/account">
                <i className="ri-smartphone-line db-icon" aria-hidden="true" /> Keep this plan on your other devices
              </a>
            )}
            {me.role === "guest" && (
              <form action={removeMe.bind(null, slug)}>
                <Button.Root mode="ghost" size="small">Remove me from this plan</Button.Root>
              </form>
            )}
          </footer>
        )}
      </main>

      {!cancelled && !wrapped && isHost && (
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
