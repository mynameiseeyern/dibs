import type { Metadata } from "next";
import { Wordmark } from "@/components/Logo";
import { guestKeyOk, memberKeyOk, parseRejoinKey } from "@/lib/rejoin";
import { crews } from "@/lib/crews";
import { store } from "@/lib/store";
import { RejoinForm } from "./RejoinForm";

// Private links: never indexed, and the preview says nothing about who it's for.
export const metadata: Metadata = { title: "Get back to your plans", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Rejoin({ params }: { params: Promise<{ key: string }> }) {
  const raw = (await params).key;
  const key = parseRejoinKey(raw);
  let who: { name: string; plan?: string } | null = null;
  if (key?.kind === "g" && guestKeyOk(key)) {
    const g = await store.getGuest(key.id);
    if (g) who = { name: [g.first_name, g.last_name].filter(Boolean).join(" ") };
  } else if (key?.kind === "m") {
    const m = await store.getMember(key.id);
    const plan = m && !m.user_id && memberKeyOk(key, m) ? await store.getPlanById(m.plan_id) : null;
    // A crew-only plan's title stays hidden here too: the rejoin link is a guest's, never the crew's.
    if (m && plan) who = { name: m.display_name, plan: (await crews.planCrew(plan)).visibility === "crew" ? undefined : plan.title };
  }

  return (
    <main className="page page--center">
      <Wordmark />
      {who ? (
        <>
          <h1 className="title-h3">Welcome back, {who.name.split(" ")[0]}</h1>
          <p className="muted">
            {who.plan
              ? `This puts you back on ${who.plan} as ${who.name}, on this browser.`
              : `This puts your plans back on this browser, as ${who.name}. If you were on another browser, that one stops being you.`}
          </p>
          <RejoinForm rawKey={raw} label={`That's me, ${who.name.split(" ")[0]}`} />
          <p className="paragraph-xs muted">Not {who.name.split(" ")[0]}? Close this page. The link is just for them.</p>
        </>
      ) : (
        <>
          <h1 className="title-h3">That link&rsquo;s run out</h1>
          <p className="muted">It may have been used already. Ask whoever made the plan to send you a new one.</p>
        </>
      )}
    </main>
  );
}
