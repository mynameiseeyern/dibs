import type { Message, PlanMember } from "@dibs/shared/types";
import { DibbyMark } from "@/components/Logo";
import { Monogram } from "@/components/Monogram";
import { TZ } from "@/lib/time";
import { Composer } from "./Composer";
import type { FormState } from "./actions";

const time = (iso: string) => new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export function Thread({
  messages,
  members,
  meId,
  canPost,
  post,
}: {
  messages: Message[];
  members: PlanMember[];
  meId: string | null;
  canPost: boolean;
  post: (s: FormState, f: FormData) => Promise<FormState>;
}) {
  const byId = new Map(members.map((m) => [m.id, m]));
  let lastStamp = 0;
  return (
    <section className="section" aria-labelledby="thread-h">
      <h2 id="thread-h" className="eyebrow">Plan chat</h2>
      <div className="db-card thread">
        {messages.length === 0 ? (
          <p className="small muted">Nothing yet. {canPost ? "Try “@dibby find us somewhere cheap”." : ""}</p>
        ) : (
          <div className="db-chat" role="log" aria-live="polite">
            {messages.map((m) => {
              const t = Date.parse(m.created_at);
              const stamp = t - lastStamp > 15 * 60 * 1000 ? <div className="db-msg__time">{time(m.created_at)}</div> : null;
              lastStamp = t;
              if (m.kind === "system") {
                return (
                  <div key={m.id}>
                    {stamp}
                    <p className="thread__system">{m.body}</p>
                  </div>
                );
              }
              if (m.kind === "dibby") {
                return (
                  <div key={m.id}>
                    {stamp}
                    <div className="db-msg db-msg--ai">
                      <span className="db-avatar db-avatar--sm" aria-hidden="true">
                        <DibbyMark size={32} />
                      </span>
                      <div>
                        <div className="db-msg__name">
                          Dibby <span className="db-badge db-badge--accent ai-tag">AI</span>
                        </div>
                        <div className="db-msg__bubble">{m.body}</div>
                      </div>
                    </div>
                  </div>
                );
              }
              const who = m.member_id ? byId.get(m.member_id) : undefined;
              const mine = m.member_id === meId;
              return (
                <div key={m.id}>
                  {stamp}
                  <div className={`db-msg${mine ? " db-msg--mine" : ""}`}>
                    {!mine && who && <Monogram name={who.display_name} colour={who.colour} size="sm" />}
                    <div>
                      {!mine && <div className="db-msg__name">{who?.display_name.split(" ")[0] ?? "Someone"}</div>}
                      <div className="db-msg__bubble">{m.body}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {canPost ? (
          <Composer action={post} />
        ) : (
          <p className="small muted thread__readonly">Get the dibs app to chat here. You can still vote and RSVP.</p>
        )}
      </div>
    </section>
  );
}
