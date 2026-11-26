import { notFound, redirect } from "next/navigation";
import { extraOn, planAccess, READ_ONLY_NOTE } from "@dibs/shared/plans";
import * as Button from "@/components/ui/button";
import { LiveRefresh } from "@/components/LiveRefresh";
import { liveVersion } from "@/lib/live-version";
import { store, usingSupabase } from "@/lib/store";
import { formatWhen } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { countIn } from "@dibs/shared/plans";
import { planPreview } from "@/lib/plan-preview";
import { markChatSeen, postMessage, toggleDibbyMute, toggleReaction } from "../actions";
import { MarkSeen } from "./MarkSeen";
import { Thread } from "../Thread";
import { personKey } from "@dibs/shared/moderation";
import { screenFor } from "@/lib/moderation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return planPreview((await params).slug, { label: "Chat", path: "/chat" });
}
export const dynamic = "force-dynamic";

/** The plan's chat, on its own screen. The Chat button on the plan shows how many messages are new to you. */
export default async function Chat({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view) notFound();
  const { plan, members, me } = view;
  // Chat is for people on the plan; "can't go" don't see it (same as the plan page).
  if (!me || planAccess(me).level === "hidden" || plan.status === "cancelled" || !extraOn(plan, "chat")) redirect(`/p/${slug}`);
  const access = planAccess(me);
  const readOnly = access.level === "read" ? READ_ONLY_NOTE[access.why] : null;
  const [messages, reactions, options] = await Promise.all([store.listMessages(plan.id, 100), store.listReactions(plan.id), store.listOptions(plan.id)]);
  const wrapped = plan.status === "wrapped";
  // Blocked people and anything you've reported are gone from your view, not everyone's.
  const screen = await screenFor(personKey(me));
  const authors = new Map(members.map((m) => [m.id, personKey(m)]));
  const shown = messages.filter((m) => !screen.reported.has(m.id) && !(m.member_id && screen.blocked.has(authors.get(m.member_id) ?? "")));

  return (
    <>
      <LiveRefresh planId={plan.id} version={liveVersion(plan, members.map(({ chat_seen_at, ...m }) => m), messages, reactions)} />
      <MarkSeen latest={messages.at(-1)?.id ?? null} mark={markChatSeen.bind(null, slug)} />
      <main className="page chat-page">
        <header className="topbar">
          <Button.Root asChild variant="neutral" mode="lighter" iconOnly>
            <a href={`/p/${slug}`} aria-label={`Back to ${plan.title}`}>
              <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
            </a>
          </Button.Root>
          <div className="chat-page__title">
            <h1 className="label-lg">{plan.title}</h1>
            <span className="paragraph-xs muted">Chat</span>
          </div>
          {!wrapped && (
            <form action={toggleDibbyMute.bind(null, slug)}>
              <Button.Root variant="neutral" mode="ghost" iconOnly aria-pressed={me.dibby_muted} aria-label={me.dibby_muted ? "Show Dibby's nudges" : "Mute Dibby's nudges"}>
                <i className={`${me.dibby_muted ? "ri-notification-off-line" : "ri-notification-3-line"} db-icon`} aria-hidden="true" />
              </Button.Root>
            </form>
          )}
        </header>
        <Thread
          messages={me.dibby_muted ? shown.filter((m) => !m.auto) : shown}
          vibe={plan.vibe}
          reactions={reactions}
          react={me.user_id && !readOnly ? toggleReaction.bind(null, slug) : undefined}
          summary={[plan.title, formatWhen(plan.starts_at), plan.venue_name ?? plan.area, `${countIn(members)} going`].filter(Boolean).join(" · ")}
          members={members}
          meId={me.id}
          canPost={Boolean(me.user_id)}
          readOnly={readOnly}
          placeNames={Object.fromEntries(options.filter((o) => o.place_id).map((o) => [o.place_id!, o.label]))}
          post={postMessage.bind(null, slug)}
          slug={slug}
          isHost={view.isHost}
          voting={plan.status === "voting"}
          emailGate={me.guest_id && !me.user_id ? { planId: plan.id, demo: !usingSupabase } : undefined}
        />
      </main>
    </>
  );
}
