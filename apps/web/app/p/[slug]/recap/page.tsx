import { notFound, redirect } from "next/navigation";
import { monogram } from "@dibs/shared/plans";
import { Monogram } from "@/components/Monogram";
import { store } from "@/lib/store";
import { formatWhen } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { saveRecap } from "./actions";
import { RecapForm } from "./RecapForm";

export const metadata = { title: "Recap" };
export const dynamic = "force-dynamic";

export default async function Recap({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view) notFound();
  const { plan, members, me } = view;
  if (plan.status !== "wrapped") redirect(`/p/${slug}`);

  const back = (
    <header className="topbar">
      <a className="db-btn db-btn--secondary db-btn--icon" href={`/p/${slug}`} aria-label="Back to the plan">
        <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
      </a>
      <a className="db-btn db-btn--ghost db-btn--sm" href={`/p/${slug}/bills`}>Bills</a>
    </header>
  );

  // The recap, like the bills, is only for people who were there.
  if (!me?.attended) {
    return (
      <main className="page">
        {back}
        <div className="db-alert db-alert--information" role="status">
          <i className="ri-lock-2-fill db-icon" aria-hidden="true" />
          <div><strong>The recap is just for people who came</strong>Catch you at the next one.</div>
        </div>
      </main>
    );
  }

  const answers = await store.listRecap(plan.id);
  const mine = answers.find((a) => a.member_id === me.id);
  const byId = new Map(members.map((m) => [m.id, m]));
  const first = (id: string) => byId.get(id)?.display_name.split(" ")[0] ?? "Someone";
  const came = members.filter((m) => m.attended);

  const rated = answers.filter((a) => a.stars);
  const avg = rated.length ? rated.reduce((s, a) => s + (a.stars ?? 0), 0) / rated.length : null;
  const mvpVotes = new Map<string, number>();
  for (const a of answers) if (a.mvp_member_id) mvpVotes.set(a.mvp_member_id, (mvpVotes.get(a.mvp_member_id) ?? 0) + 1);
  const topMvp = [...mvpVotes.entries()].sort((a, b) => b[1] - a[1])[0];
  const moments = answers.filter((a) => a.best_moment);

  return (
    <main className="page">
      {back}
      <div className="section">
        <span className="eyebrow">{plan.title} · {formatWhen(plan.starts_at) ?? "recap"}</span>
        <h1 className="title-h3">The recap</h1>
        <p className="muted">{answers.length} of {came.length} have chimed in. Only people who came can see this.</p>
      </div>

      <RecapForm
        action={saveRecap.bind(null, slug)}
        people={came.filter((m) => m.id !== me.id).map((m) => ({ id: m.id, first: m.display_name.split(" ")[0] ?? m.display_name, initials: monogram(m.display_name), colour: m.colour }))}
        initial={{ stars: mine?.stars ?? null, best: mine?.best_moment ?? null, mvp: mine?.mvp_member_id ?? null }}
      />

      {answers.length > 0 && (
        <section className="section" aria-labelledby="crew-h">
          <h2 id="crew-h" className="eyebrow">What the crew said</h2>
          <div className="recap-stats">
            {avg !== null && (
              <div className="db-card recap-stat">
                <span className="recap-stat__big">{avg.toFixed(1)}<i className="ri-star-fill" aria-hidden="true" /></span>
                <span className="small muted">from {rated.length} {rated.length === 1 ? "rating" : "ratings"}</span>
              </div>
            )}
            {topMvp && (
              <div className="db-card recap-stat">
                <span className="recap-stat__big">{first(topMvp[0])}</span>
                <span className="small muted">MVP · {topMvp[1]} {topMvp[1] === 1 ? "vote" : "votes"}</span>
              </div>
            )}
          </div>
          {moments.length > 0 && (
            <div className="db-card">
              <ul className="people">
                {moments.map((a) => {
                  const m = byId.get(a.member_id);
                  return (
                    <li key={a.member_id} className="person">
                      {m && <Monogram name={m.display_name} colour={m.colour} />}
                      <span className="person__name">
                        &ldquo;{a.best_moment}&rdquo;
                        <small>{first(a.member_id)}{a.stars ? ` · ${a.stars}/5` : ""}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
