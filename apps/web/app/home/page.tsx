import { redirect } from "next/navigation";
import { countIn } from "@dibs/shared/plans";
import { CrewWave, Wordmark } from "@/components/Logo";
import { currentOrganiser } from "@/lib/auth";
import { store } from "@/lib/store";
import { formatWhen } from "@/lib/time";
import { signOutAction } from "../actions";

export const metadata = { title: "Your plans" };
export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await currentOrganiser();
  if (!me) redirect("/login?next=/home");
  if (!(await store.getProfile(me.id))) redirect("/onboarding?next=/home");

  const rows = await store.listPlansForUser(me.id);
  const upcoming = await Promise.all(
    rows
      .filter(({ plan }) => plan.status !== "cancelled" && (!plan.starts_at || Date.parse(plan.starts_at) > Date.now() - 6 * 3600 * 1000))
      .map(async (r) => ({ ...r, inCount: countIn(await store.listMembers(r.plan.id)) }))
  );

  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/home" />
        <form action={signOutAction}>
          <button className="db-btn db-btn--ghost db-btn--sm">Sign out</button>
        </form>
      </header>

      {upcoming.length === 0 ? (
        <section className="empty">
          <CrewWave />
          <h1 className="title-h3">Nothing on. Suss.</h1>
          <p className="muted">Start something and drop it in the group chat.</p>
        </section>
      ) : (
        <section className="section" aria-labelledby="up-h">
          <h1 id="up-h" className="title-h3">Up next</h1>
          {upcoming.map(({ plan, member, inCount }) => (
            <a key={plan.id} href={`/p/${plan.slug}`} className="db-card db-plan" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="db-plan__eyebrow">{member.role === "guest" ? "Going" : "Hosting"}</span>
              <h2 className="db-plan__title">{plan.title}</h2>
              <ul className="db-plan__facts">
                {plan.starts_at && (
                  <li>
                    <i className="ri-calendar-line db-icon" aria-hidden="true" /> {formatWhen(plan.starts_at)}
                  </li>
                )}
                <li>
                  <i className="ri-group-line db-icon" aria-hidden="true" /> {inCount} in
                </li>
              </ul>
            </a>
          ))}
        </section>
      )}

      <div className="dock">
        <div className="dock__inner">
          <a href="/new" className="db-btn db-btn--dibs db-btn--lg db-btn--block">
            <i className="ri-add-line db-icon" aria-hidden="true" /> Start a plan
          </a>
        </div>
      </div>
    </main>
  );
}
