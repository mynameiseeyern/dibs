import type { Message, PlanMember, Vibe } from "@dibs/shared/types";
import { REACTIONS, type Reaction } from "@/lib/store/types";
import { DibbyMark } from "@/components/Logo";
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

const time = (iso: string) => new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export function Thread({
  messages,
  members,
  meId,
  canPost,
  readOnly,
  post,
  vibe,
  reactions = [],
  react,
  summary,
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
  post: (s: FormState, f: FormData) => Promise<FormState>;
}) {
  const byId = new Map(members.map((m) => [m.id, m]));
  let lastStamp = 0;
  return (
    <section className="section" aria-labelledby="thread-h">
      <h2 id="thread-h" className="sr-only">Plan chat</h2>
      <div className="db-card thread">
        {summary && (
          <p className="thread__pin">
            <i className="ri-pushpin-2-line db-icon" aria-hidden="true" />
            <span>{summary}</span>
          </p>
        )}
        {messages.length === 0 ? (
          <p className="paragraph-sm muted">Nothing yet. {canPost ? "Try “@dibby find us somewhere cheap”." : ""}</p>
        ) : (
          <div className="db-chat" role="log" aria-live="polite">
            <Fresh>
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
                  <div key={m.id} data-fresh-id={m.id}>
                    {stamp}
                    <div className="db-msg db-msg--ai">
                      <Avatar.Root size="32" className="bg-transparent" aria-hidden="true">
                        <DibbyMark size={32} />
                      </Avatar.Root>
                      <div>
                        <div className="db-msg__name">
                          Dibby <Badge.Root color="accent" className="ai-tag">AI</Badge.Root>
                        </div>
                        <DibbyBody body={dibbyText(m, vibe)} />
                        <Reactions messageId={m.id} all={reactions} meId={meId} react={react} />
                      </div>
                    </div>
                  </div>
                );
              }
              const who = m.member_id ? byId.get(m.member_id) : undefined;
              const mine = m.member_id === meId;
              return (
                <div key={m.id} data-fresh-id={m.id}>
                  {stamp}
                  <div className={`db-msg${mine ? " db-msg--mine" : ""}`}>
                    {!mine && who && <Monogram name={who.display_name} colour={who.colour} size="sm" />}
                    <div>
                      {!mine && <div className="db-msg__name">{who?.display_name.split(" ")[0] ?? "Someone"}</div>}
                      <div className="db-msg__bubble">{m.body}</div>
                      <Reactions messageId={m.id} all={reactions} meId={meId} react={react} />
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
        ) : (
          <p className="paragraph-sm muted thread__readonly">Get the dibs app to chat here. You can still vote and RSVP.</p>
        )}
      </div>
    </section>
  );
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
