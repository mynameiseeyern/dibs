import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryIcon, countIn, extraOn, planAccess, READ_ONLY_NOTE, shareText, unreadCount, wrapState } from "@dibs/shared/plans";
import { formatAud } from "@dibs/shared/bills";
import type { PlanMember, Rsvp } from "@dibs/shared/types";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { Suspense } from "react";
import { Weather } from "./Weather";
import { RsvpPicker } from "./RsvpPicker";
import { HostMenu } from "./HostMenu";
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
import { removeMyPhoto, addTime, goWithTime, markFree, removeTime, appInterest, trackShare, addOption, askDibbyMore, joinPlan, lockPlan, removeMe, removeOption, setRsvp, vote } from "./actions";
import { hostRejoinLink, setHost, setPlace } from "./manage/actions";
import { SaveSpot } from "@/components/SaveSpot";
import { guestRejoinUrl } from "@/lib/rejoin";
import { JoinForm } from "./JoinForm";
import { ShareButton } from "./ShareButton";
import { GetTheApp } from "./GetTheApp";
import { CameraCard } from "./CameraCard";
import { PhotoRoll } from "./PhotoRoll";
import { loadRoll } from "@/lib/photos";
import { CircleAction } from "@/components/CircleAction";
import { WhenWorks } from "./WhenWorks";
import { MAX_TIMES, rankTimes } from "@dibs/shared/when";
import { VoteList } from "./Vote";
import { siteUrl } from "@/lib/site";
import { planPreview } from "@/lib/plan-preview";
import * as Button from "@/components/ui/button";
import * as Badge from "@/components/ui/badge";
import * as Alert from "@/components/ui/alert";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ when?: string; kept?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return planPreview((await params).slug);
}

const ORDER: (Rsvp | "waitlist" | "none")[] = ["in", "maybe", "waitlist", "none", "out"];
const GROUP_LABEL = { in: "Going", maybe: "Maybe", waitlist: "Waitlist", none: "Hasn't said yet", out: "Can't make it" } as const;
const groupOf = (m: PlanMember) => (m.waitlisted ? "waitlist" : m.rsvp ?? "none");

export default async function PlanPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const askWhen = sp.when === "ask";
  const kept = sp.kept === "1";
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
  const wrap = wrapState(plan);
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

  // When works? (ARV-21): only people who can take part count towards the best time.
  const whenOpen = Boolean(me) && !started && (plan.status === "voting" || plan.status === "locked");
  const [times, timeVotes] = whenOpen ? await Promise.all([store.listTimes(plan.id), store.listTimeVotes(plan.id)]) : [[], []];
  const counted = new Set(members.filter((m) => planAccess(m).level === "full").map((m) => m.id));
  const ranked = rankTimes(times, timeVotes, counted);
  const byId = new Map(members.map((m) => [m.id, m]));
  const whenRows = ranked.rows.map((r) => ({
    id: r.time.id,
    label: formatWhen(r.time.starts_at) ?? "",
    short: formatShort(r.time.starts_at) ?? "",
    free: r.free.flatMap((id) => (byId.get(id) ? [byId.get(id)!] : [])),
    mine: Boolean(me && r.free.includes(me.id)),
  }));
  const showWhen = whenOpen && (times.length > 0 || (isHost && (!plan.starts_at || askWhen)));

  // Who's going, at a glance: "3 in · 1 maybe · 2 to reply".
  const maybes = members.filter((m) => m.rsvp === "maybe").length;
  const toReply = members.filter((m) => !m.rsvp && !m.waitlisted).length;
  const waitlist = members.filter((m) => m.waitlisted).length;
  const whoSummary = [`${inCount} in${full ? " (full)" : ""}`, maybes && `${maybes} maybe`, toReply && `${toReply} to reply`, waitlist && `${waitlist} on the waitlist`].filter(Boolean).join(" · ");
  const host = members.find((m) => m.role === "organiser");
  const hostedBy = isHost ? "Hosted by you" : host ? `Hosted by ${host.display_name.split(" ")[0]}` : null;
  // Directions: a place from the map, or a typed-in address for people in the plan.
  const directions = plan.venue_place_id && plan.venue_name ? mapsLink(plan.venue_place_id, plan.venue_name) : me && plan.venue_address ? mapsLink(null, plan.venue_address) : null;
  const calendar = me && canAddToCalendar(plan) && plan.status === "locked";
  // New messages since they last opened the chat, for the badge on the Chat button.
  const unread = me ? unreadCount(me.dibby_muted ? messages.filter((m) => !m.auto) : messages, me) : 0;
  const voteOpen = plan.status === "voting";
  const iAmIn = Boolean(me && me.rsvp === "in" && !me.waitlisted);
  // Extras the organiser switched off are hidden; whatever was there stays for if they're back on.
  const chatOn = extraOn(plan, "chat");
  const photosOn = extraOn(plan, "photos");
  const billsOn = extraOn(plan, "bills");
  const recapOn = extraOn(plan, "recap");
  const chatOpen = chatOn && Boolean(me) && access?.level !== "hidden";
  // Pics, during the night. They're revealed at wrap-up in the recap, or here if the recap's off.
  const roll = photosOn && (!wrapped || !recapOn) ? await loadRoll(plan, members, me) : null;

  return (
    <>
      <LiveRefresh />
      <main className="page plan-page">
        <header className="topbar">
          <Wordmark href={view.here.name ? "/home" : "/"} />
          <div className="topbar__end">
            <AccountButton here={view.here} />
          </div>
        </header>

        {kept && (
          <Alert.Root status="success" role="status">
            <Alert.Icon as="i" className="ri-mail-check-line" aria-hidden="true" />
            <div>Plan&rsquo;s made. Check your email for a link to keep it on any device.</div>
          </Alert.Root>
        )}

        {/* 1. The event: what, when, where, who's hosting. Edit, calendar and directions live on it. */}
        <article className={`db-card db-plan${cancelled ? "" : " db-card--sticker"}`} aria-labelledby="plan-h">
          <div className="plan-card__top">
            <Badge.Root color={status.tone}>
              <Badge.Icon as="i" className={status.icon} aria-hidden="true" />
              {status.label}
            </Badge.Root>
            {plan.category && (
              <Badge.Root color="faded" variant="lighter">
                <Badge.Icon as="i" className={categoryIcon(plan.category)} aria-hidden="true" />
                {plan.category}
              </Badge.Root>
            )}
          </div>
          <div>
            <h1 id="plan-h" className="title-h3 plan-title">{plan.title}</h1>
            {hostedBy && <p className="paragraph-sm muted">{hostedBy}</p>}
          </div>
          {plan.description && <p className="paragraph-sm plan-desc">{plan.description}</p>}
          <ul className="db-plan__facts">
            <li>
              <i className="ri-calendar-line db-icon" aria-hidden="true" /> {when ?? <span className="muted">Time to be decided</span>}
            </li>
            <li>
              <i className="ri-map-pin-line db-icon" aria-hidden="true" />
              <span>
                {plan.venue_name ? (
                  // A typed-in place's address is only for people in the plan.
                  <>
                    {plan.venue_name}
                    {me && !plan.venue_place_id && plan.venue_address ? <span className="muted"> · {plan.venue_address}</span> : null}
                  </>
                ) : voteOpen ? (
                  <span className="muted">Up for a vote{plan.area ? ` around ${plan.area}` : ""}</span>
                ) : (
                  plan.area ?? <span className="muted">Place to be decided</span>
                )}
                {!cancelled && !wrapped && (
                  <Suspense fallback={null}>
                    <Weather plan={plan} short />
                  </Suspense>
                )}
              </span>
            </li>
          </ul>
          {cancelled && (
            <p className="label-sm plan-card__note plan-card__note--off" role="status">
              <i className="ri-close-circle-line db-icon" aria-hidden="true" />
              <span>{`${plan.updated_note ?? "This one's not happening."} Nobody owes anything for it.`}</span>
            </p>
          )}
          {!cancelled && !wrapped && (isHost || calendar || directions || chatOpen) && (
            <div className="plan-actions" role="group" aria-label="Plan actions">
              {isHost && <CircleAction icon="ri-edit-line" label="Edit" href={`/p/${slug}/manage`} />}
              {calendar && (
                <AddToCalendar
                  links={{
                    ics: `/p/${slug}/calendar`,
                    google: googleCalendarLink(plan, `${siteUrl()}/p/${slug}`),
                    outlook: outlookCalendarLink(plan, `${siteUrl()}/p/${slug}`),
                    office: outlookCalendarLink(plan, `${siteUrl()}/p/${slug}`, true),
                  }}
                />
              )}
              {directions && <CircleAction icon="ri-direction-line" label="Directions" href={directions} external />}
              {chatOpen && (
                <CircleAction
                  icon="ri-chat-3-line"
                  label="Chat"
                  href={`/p/${slug}/chat`}
                  badge={unread ? (unread > 9 ? "9+" : unread) : undefined}
                  badgeLabel={unread ? `${unread} new ${unread === 1 ? "message" : "messages"}` : undefined}
                />
              )}
            </div>
          )}
        </article>

        {plan.status === "locked" && me && <Once id={`locked:${plan.id}`} kind="lock" size={150} label={`Locked in: ${plan.venue_name ?? "the plan"}`} />}

        {/* 2. Your one job. Strangers join; guests answer; hosts are already going. */}
        {!cancelled && !me && (
          <section className="section db-card" aria-labelledby="join-h">
            <h2 id="join-h" className="title-h4">You coming?</h2>
            <JoinForm action={joinPlan.bind(null, slug)} signedIn={view.here.canOrganise} slug={slug} />
          </section>
        )}

        {me && !isHost && !cancelled && !wrapped && (
          <section className="db-card section" aria-labelledby="rsvp-h">
            {iAmIn && <Once id={`in:${plan.id}:${me.id}`} kind="pop" size={140} colour={me.colour} label="You popped up. You're in." />}
            <RsvpPicker rsvp={me.rsvp ?? null} waitlisted={me.waitlisted} plusOne={me.plus_one} plusOnes={plan.plus_ones} setRsvp={setRsvp.bind(null, slug)} vibe={plan.vibe} />
            {readOnly && (
              <p className="paragraph-sm muted rsvp-note">
                <i className="ri-eye-line db-icon" aria-hidden="true" /> {readOnly}
              </p>
            )}
            {access?.level === "hidden" && (
              <p className="paragraph-sm muted rsvp-note">
                <i className="ri-eye-off-line db-icon" aria-hidden="true" /> The vote, chat and who&rsquo;s in are hidden while you can&rsquo;t make it.
              </p>
            )}
          </section>
        )}

        {/* A guest with no email: their way back if this browser forgets them. */}
        {me?.guest_id && view.here.guest?.id === me.guest_id && !view.here.organiser && !cancelled && <SaveSpot url={guestRejoinUrl(me.guest_id)} name={me.display_name} />}

        {roll && (roll.canAdd || roll.photos.length > 0) && (
          <div className="db-stack">
            {roll.canAdd && <CameraCard slug={slug} taken={roll.taken} max={roll.max} revealed={roll.revealed} />}
            <PhotoRoll slug={slug} photos={roll.photos} revealed={roll.revealed} remove={removeMyPhoto.bind(null, slug)} />
          </div>
        )}

        {isHost && wrap === "ready" && (
          <Button.Root asChild size="large" block>
            <a href={`/p/${slug}/wrap`}>
              <i className="ri-flag-line db-icon" aria-hidden="true" />
              Wrap it up: who came?
            </a>
          </Button.Root>
        )}
        {/* Before the start, a quiet way through for when it happened early or got sorted elsewhere. */}
        {isHost && wrap === "early" && (
          <Button.Root asChild mode="ghost" size="small">
            <a href={`/p/${slug}/wrap`}>
              <i className="ri-flag-line db-icon" aria-hidden="true" />
              Already happened? Wrap it up
            </a>
          </Button.Root>
        )}

        {/* After the night: the money and the recap, for people who came. */}
        {wrapped && me?.attended && (billsOn || recapOn) && (
          <section className="wrap-links" aria-label="After the night">
            {billsOn && !allSquare && !(plan.no_bills && bills.length === 0) && (
              <a className="db-card db-card--violet section link-card" href={`/p/${slug}/bills`}>
                <strong className="title-h4">Square up</strong>
                <span>
                  {iOwe > 0
                    ? youOwe(plan.vibe, formatAud(iOwe))
                    : owedToMe > 0
                      ? owedToYou(plan.vibe, formatAud(owedToMe))
                      : bills.length === 0
                        ? "Paid for something? Add it and Dibby does the maths."
                        : `${owed.length - open.length} of ${owed.length} settled.`}
                </span>
              </a>
            )}
            {recapOn && (
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
            )}
            {billsOn && plan.no_bills && bills.length === 0 && (
              <a className="history-link" href={`/p/${slug}/bills?add=1`}>
                <i className="ri-receipt-line db-icon" aria-hidden="true" />
                <span className="label-sm">Paid for something after all?</span>
                <span className="paragraph-sm muted">Add a bill</span>
              </a>
            )}
            {billsOn && allSquare && (
              <a className="history-link" href={`/p/${slug}/bills`}>
                <i className="ri-check-double-line db-icon" aria-hidden="true" />
                <span className="label-sm">Bills · everyone&rsquo;s square</span>
                <span className="paragraph-sm muted">See history</span>
              </a>
            )}
          </section>
        )}
        {wrapped && me && !me.attended && (billsOn || recapOn) && (
          <p className="paragraph-sm muted">
            {billsOn && recapOn ? "The bills and recap are" : billsOn ? "The bills are" : "The recap is"} just for people who came. Catch you at the next one.
          </p>
        )}
        {/* After wrap-up the plan's set, but hosts can still switch the extras. */}
        {wrapped && isHost && (
          <Button.Root asChild mode="ghost" size="small" className="self-start">
            <a href={`/p/${slug}/manage`}>
              <i className="ri-equalizer-line db-icon" aria-hidden="true" />
              Extras
            </a>
          </Button.Root>
        )}

        {!cancelled && access?.level !== "hidden" && (
          <>
            {/* 3. Who's going: faces and counts; tap for everyone. */}
            <details className="db-card who" open={wrapped ? true : undefined}>
              <summary className="who__summary">
                <span className="who__text">
                  <span className="label-md">{wrapped ? "Who came" : "Who's going"}</span>
                  <span className="paragraph-sm muted">{wrapped ? `${came.length} came` : whoSummary}</span>
                </span>
                <MonogramStack people={wrapped ? came : going} max={4} />
                <i className="ri-arrow-down-s-line db-icon who__chevron" aria-hidden="true" />
              </summary>
              <ul className="people">
                {wrapped &&
                  came.map((m) => (
                    <li key={m.id} className="person">
                      <Monogram name={m.display_name} colour={m.colour} />
                      <span className="label-md person__name">
                        {m.display_name}
                        {m.id === me?.id ? " (you)" : ""}
                        <small>{m.role === "organiser" ? "Organiser" : m.role === "cohost" ? "Co-host" : "Came"}</small>
                      </span>
                      {isHost && m.id !== me?.id && !m.user_id && (
                        <HostMenu name={m.display_name} role="guest" canRun={false} why={null} canManage={false} setHost={setHost.bind(null, slug, m.id)} rejoin={hostRejoinLink.bind(null, slug, m.id)} />
                      )}
                    </li>
                  ))}
                {!wrapped &&
                  ORDER.flatMap((g) =>
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
                          {isHost && m.id !== me?.id && m.role !== "organiser" && (me?.role === "organiser" ? g === "in" || m.role === "cohost" || !m.user_id : !m.user_id) && (
                            <HostMenu
                              name={m.display_name}
                              role={m.role === "cohost" ? "cohost" : "guest"}
                              canRun={g === "in" && Boolean(m.user_id)}
                              why={g !== "in" ? `${m.display_name.split(" ")[0]} isn't going right now.` : `${m.display_name.split(" ")[0]} joined without the app. They need it to help run a plan.`}
                              setHost={setHost.bind(null, slug, m.id)}
                              rejoin={m.user_id ? undefined : hostRejoinLink.bind(null, slug, m.id)}
                              canManage={me?.role === "organiser"}
                            />
                          )}
                        </li>
                      ))
                  )}
              </ul>
              {!wrapped && <p className="paragraph-xs muted who__cap">{inCount} of {plan.capacity} spots taken</p>}
            </details>

            {/* 4. Decide: only while something's open. */}
            {showWhen && (
              <WhenWorks
                rows={whenRows}
                bestId={ranked.bestId}
                outOf={counted.size}
                me={me ? { id: me.id, display_name: me.display_name, colour: me.colour } : null}
                readOnly={readOnly}
                isHost={isHost}
                max={MAX_TIMES}
                startOpen={askWhen}
                actions={{
                  markFree: markFree.bind(null, slug),
                  ...(isHost ? { add: addTime.bind(null, slug), remove: removeTime.bind(null, slug), go: goWithTime.bind(null, slug) } : {}),
                }}
              />
            )}
            {voteOpen && (
              <section className="section" aria-labelledby="vote-h">
                <div className="section__head">
                  <h2 id="vote-h" className="title-h5">Where to?</h2>
                  <span className="paragraph-sm muted">
                    {voters} of {members.length} voted{plan.vote_deadline ? ` · closes ${formatShort(plan.vote_deadline)}` : ""}
                  </span>
                </div>
                <VoteList
                  rows={voteRows}
                  canVote={Boolean(me)}
                  open
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
                {isHost && options.length > 0 && (
                  <form action={lockPlan.bind(null, slug)}>
                    <Button.Root mode="ghost" size="small">
                      <i className="ri-lock-2-line db-icon" aria-hidden="true" />
                      Lock it in now
                    </Button.Root>
                  </form>
                )}
              </section>
            )}

          </>
        )}

        {me?.guest_id && view.guest && me.guest_id === view.guest.id && (
          <footer className="plan-foot">
            {iAmIn && <GetTheApp onTap={appInterest.bind(null, slug)} />}
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

      {/* 6. One share button, pinned. */}
      {me && !cancelled && !wrapped && (
        <div className="dock">
          <div className="dock__inner">
            <ShareButton
              label={isHost ? "Share to the group chat" : "Share the plan"}
              tone={isHost ? "dibs" : "primary"}
              onShare={trackShare.bind(null, slug, isHost ? "invite" : "im_in")}
              title={plan.title}
              url={url}
              text={
                !isHost && iAmIn
                  ? `I'm in for ${[plan.title, formatShort(plan.starts_at), plan.venue_name].filter(Boolean).join(" · ")}. ${inCount} going so far, you coming? 👉 ${url}`
                  : shareText({
                      title: plan.title,
                      when: formatShort(plan.starts_at),
                      place: plan.venue_name ?? plan.area,
                      voting: voteOpen,
                      deadline: formatShort(plan.vote_deadline),
                      url,
                    })
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
