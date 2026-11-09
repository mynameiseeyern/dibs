import type { Message, PlanMember, Vibe } from "@dibs/shared/types";
import { ChatEmailGate } from "./ChatEmailGate";
import { REACTIONS, type Reaction } from "@/lib/store/types";
import { DibbyMark } from "@/components/Logo";
import { Dibby } from "@/components/Dibby";
import { Monogram } from "@/components/Monogram";
import { TZ } from "@/lib/time";
import { Composer, ReadOnlyComposer } from "./Composer";
import { Fresh } from "@/components/moments/Fresh";
import { StickToBottom } from "@/components/StickToBottom";
import type { FormState } from "./actions";
import { splitPlanLink } from "@/lib/thread-links";
import { asTemplate, renderTemplate } from "@/lib/copy";
import * as Button from "@/components/ui/button";
import * as Badge from "@/components/ui/badge";
import * as Avatar from "@/components/ui/avatar";
import { PlaceTiles } from "@/components/maps/PlaceTiles";
import { placesOf } from "@/lib/place-ids";
import { areaChoices, askOf, memoOf } from "@/lib/area";
import { WhereChips } from "./WhereChips";
import { ContentMenu } from "@/components/ContentMenu";
import { canDeleteMessage, personKey, type ReportReason } from "@dibs/shared/moderation";
import { blockMember, deleteMessage, reportThing } from "./moderation-actions";

const time = (iso: string) => new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export function Thread({
  messages,
  members,
  meId,
  canPost,
  readOnly,
  placeNames,
  post,
  vibe,
  reactions = [],
  react,
  summary,
  emailGate,
  slug,
  isHost = false,
}: {
  vibe: Vibe;
  reactions?: Reaction[];
  /** Toggle a reaction; absent for people who can't post (guests). */
  react?: (messageId: string, emoji: string) => Promise<void>;
  /** One line pinned at the top: what, when, where, how many. */
  summary?: string;
  messages: Message[];
  members: PlanMember[];
  meId: string | null;
  canPost: boolean;
  /** Set when this person can only read along (a maybe, not replied, waitlisted): why. */
  readOnly?: string | null;
  /** Names of the places on this plan's vote, by Google place ID, for Dibby's place tiles. */
  placeNames?: Record<string, string>;
  post: (s: FormState, f: FormData) => Promise<FormState>;
  /** A guest going on this plan: ask for an email (which lets them chat) instead of a dead end. */
  emailGate?: { planId: string; demo: boolean };
  /** Report, block and delete need to know the plan and who's running it. */
  slug: string;
  isHost?: boolean;
}) {
  const byId = new Map(members.map((m) => [m.id, m]));
  let lastStamp = 0;
  // Only Dibby's latest message gets the area chips, so old ones don't pile up in the chat.
  const lastDibby = [...messages].reverse().find((m) => m.kind === "dibby");
  const areasUsed = areaChoices([...messages].reverse().map((m) => (m.kind === "dibby" ? memoOf(m.template)?.area : null)), null);
  return (
    <section className="section" aria-labelledby="thread-h">
      <h2 id="thread-h" className="sr-only">Plan chat</h2>
      <div className="thread">
        {summary && (
          <p className="thread__pin">
            <i className="ri-pushpin-2-line db-icon" aria-hidden="true" />
            <span>{summary}</span>
          </p>
        )}
        {messages.length === 0 ? (
          <p className="paragraph-sm muted thread__empty"><Dibby mood="look" size="sm" className="thread__empty-dibby" />Nothing yet. {canPost ? "Try “@dibby find us somewhere cheap”." : ""}</p>
        ) : (
          <div className="db-chat" role="log" aria-live="polite">
            <Fresh sounds>
            {messages.map((m) => {
              const t = Date.parse(m.created_at);
              const stamp = t - lastStamp > 15 * 60 * 1000 ? <div className="db-msg__time">{time(m.created_at)}</div> : null;
              lastStamp = t;
              if (m.kind === "system") {
                return (
                  <div key={m.id} data-fresh-id={m.id}>
                    {stamp}
                    <p className="thread__system">{m.body}</p>
                  </div>
                );
              }
              if (m.kind === "dibby") {
                return (
                  <div key={m.id} data-fresh-id={m.id} data-fresh-sound="dibby">
                    {stamp}
                    <div className={`db-msg db-msg--ai${placesOf(m.template).length ? " db-msg--wide" : ""}`}>
                      <Avatar.Root size="32" className="bg-transparent" aria-hidden="true">
                        <DibbyMark size={32} />
                      </Avatar.Root>
                      <div className="db-msg__body">
                        <div className="db-msg__name">
                          Dibby <Badge.Root color="accent" className="ai-tag">AI</Badge.Root>
                        </div>
                        <DibbyBody body={dibbyText(m, vibe)} />
                        <PlaceTiles
                          places={placesOf(m.template).map((id) => ({ placeId: id, name: placeNames?.[id] ?? "A place Dibby found", onVote: Boolean(placeNames?.[id]) }))}
                        />
                        {canPost && !readOnly && m.id === lastDibby?.id && <Where template={m.template} areas={areasUsed} post={post} />}
                        <div className="msg-foot">
                          <Reactions messageId={m.id} all={reactions} meId={meId} react={react} />
                          {/* AI replies can be reported too. */}
                          <ContentMenu
                            title="Dibby's message"
                            label="Report Dibby's message"
                            report={reportThing.bind(null, slug, "message", m.id) as (r: ReportReason, n: string) => Promise<{ error?: string }>}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              const who = m.member_id ? byId.get(m.member_id) : undefined;
              const mine = m.member_id === meId;
              return (
                <div key={m.id} data-fresh-id={m.id} data-fresh-sound={mine ? undefined : "receive"}>
                  {stamp}
                  <div className={`db-msg${mine ? " db-msg--mine" : ""}`}>
                    {!mine && who && <Monogram name={who.display_name} colour={who.colour} size="sm" />}
                    <div>
                      {!mine && <div className="db-msg__name">{who?.display_name.split(" ")[0] ?? "Someone"}</div>}
                      <div className="db-msg__bubble">{m.body}</div>
                      <div className="msg-foot">
                        <Reactions messageId={m.id} all={reactions} meId={meId} react={react} />
                        {meId && (
                          <ContentMenu
                            title={mine ? "Your message" : `${who?.display_name.split(" ")[0] ?? "Someone"}'s message`}
                            label={mine ? "Options for your message" : `Options for ${who?.display_name.split(" ")[0] ?? "this"} message`}
                            report={mine ? undefined : (reportThing.bind(null, slug, "message", m.id) as (r: ReportReason, n: string) => Promise<{ error?: string }>)}
                            block={!mine && who && personKey(who) ? { name: who.display_name, act: blockMember.bind(null, slug, who.id) } : undefined}
                            remove={canDeleteMessage(m, { id: meId }, isHost) ? { label: "Delete message", done: "Deleted", act: deleteMessage.bind(null, slug, m.id) } : undefined}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </Fresh>
            <StickToBottom />
          </div>
        )}
        {readOnly ? (
          <ReadOnlyComposer note={readOnly} />
        ) : canPost ? (
          <Composer action={post} />
        ) : emailGate ? (
          <ChatEmailGate planId={emailGate.planId} demo={emailGate.demo} />
        ) : (
          <p className="paragraph-sm muted thread__readonly">Get the Dibby app to chat here. You can still vote and RSVP.</p>
        )}
      </div>
    </section>
  );
}

/** Under Dibby's latest message: its "where abouts?" chips, or where it just looked. */
function Where({ template, areas, post }: { template: unknown; areas: string[]; post: (s: FormState, f: FormData) => Promise<FormState> }) {
  const ask = askOf(template);
  if (ask) return <WhereChips mode="ask" query={ask.query} areas={ask.areas.length ? ask.areas : areas} post={post} />;
  const memo = memoOf(template);
  if (!memo) return null;
  return <WhereChips mode="brief" query={memo.query} lookedIn={memo.area} areas={areas} post={post} />;
}

/** Dibby's message, with a button when it points to another plan. */
function DibbyBody({ body }: { body: string }) {
  const { text, slug } = splitPlanLink(body);
  return (
    <>
      <div className="db-msg__bubble">{text}</div>
      {slug && (
        <Button.Root asChild>
          <a className="thread__plan-link" href={`/p/${slug}`}>
            <i className="ri-arrow-right-up-line db-icon" aria-hidden="true" />
            Open the new plan
          </a>
        </Button.Root>
      )}
    </>
  );
}

/** Templated messages re-render in the plan's current vibe; the rest show as posted. */
function dibbyText(m: Message, vibe: Vibe): string {
  const t = asTemplate(m.template);
  return t ? renderTemplate(t, vibe) : m.body;
}

/** Reaction chips under a message, and a small picker for people who can post. */
function Reactions({
  messageId,
  all,
  meId,
  react,
}: {
  messageId: string;
  all: Reaction[];
  meId: string | null;
  react?: (messageId: string, emoji: string) => Promise<void>;
}) {
  const here = all.filter((r) => r.message_id === messageId);
  const counts = REACTIONS.map((e) => ({ e, n: here.filter((r) => r.emoji === e).length, mine: here.some((r) => r.emoji === e && r.member_id === meId) })).filter((c) => c.n > 0);
  if (counts.length === 0 && !react) return null;
  return (
    <div className="reactions">
      {counts.map((c) =>
        react ? (
          <form key={c.e} action={react.bind(null, messageId, c.e)}>
            <button className="reaction" aria-pressed={c.mine} aria-label={`${c.e} ${c.n}${c.mine ? ", including you" : ""}`}>
              <span aria-hidden="true">{c.e}</span> {c.n}
            </button>
          </form>
        ) : (
          <span key={c.e} className="reaction" aria-label={`${c.e} ${c.n}`}>
            <span aria-hidden="true">{c.e}</span> {c.n}
          </span>
        )
      )}
      {react && (
        <details className="reaction-pick">
          <summary className="reaction" aria-label="React">
            <i className="ri-emotion-line db-icon" aria-hidden="true" />
          </summary>
          <div className="reaction-pick__menu">
            {REACTIONS.map((e) => (
              <form key={e} action={react.bind(null, messageId, e)}>
                <button className="reaction" aria-label={`React ${e}`}>
                  <span aria-hidden="true">{e}</span>
                </button>
              </form>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
