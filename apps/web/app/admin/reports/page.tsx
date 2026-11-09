import { notFound } from "next/navigation";
import { reasonLabel } from "@dibs/shared/moderation";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import { isAdmin } from "@/lib/admin-access";
import { store } from "@/lib/store";
import { formatStamp } from "@/lib/time";
import { dismiss, removeAndBan, removeContent } from "./actions";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const HOUR = 3600 * 1000;

/** Everything people have reported, oldest first. Same access as /admin/metrics. Apple wants each one acted on within 24 hours. */
export default async function Reports() {
  if (!(await isAdmin())) notFound();
  const reports = await store.listOpenReports().catch(() => null);
  const plans = new Map(
    await Promise.all([...new Set((reports ?? []).map((r) => r.plan_id).filter(Boolean) as string[])].map(async (id) => [id, await store.getPlanById(id)] as const))
  );
  return (
    <main className="page">
      <header className="topbar">
        <Wordmark />
      </header>
      <h1 className="title-h3">Reports</h1>
      {reports === null ? (
        <p className="muted">Couldn&rsquo;t read the queue. Has migration 0028 been run?</p>
      ) : reports.length === 0 ? (
        <p className="muted">Nothing to look at.</p>
      ) : (
        reports.map((r) => {
          const plan = r.plan_id ? plans.get(r.plan_id) : null;
          const hours = Math.floor((Date.now() - Date.parse(r.created_at)) / HOUR);
          const canTakeDown = r.kind !== "member" && Boolean(r.plan_id);
          return (
            <section key={r.id} className="db-card section">
              <h2 className="label-lg">{reasonLabel(r.reason)}</h2>
              <p className={hours >= 20 ? "label-sm text-error-base" : "paragraph-xs muted"}>
                {r.kind} · {formatStamp(r.created_at)} · {hours}h ago
              </p>
              {r.snapshot && <p className="paragraph-md">{r.snapshot}</p>}
              {r.kind === "photo" && (
                // eslint-disable-next-line @next/next/no-img-element -- access-checked route; not for next/image
                <img src={`/admin/reports/${r.id}/photo`} alt="The reported" style={{ maxWidth: "100%", borderRadius: "var(--radius-md)" }} />
              )}
              {r.note && <p className="paragraph-sm muted">Their note: {r.note}</p>}
              {plan && <a className="label-sm" href={`/p/${plan.slug}`}>{plan.title}</a>}
              <div className="flex flex-col gap-2">
                {canTakeDown && (
                  <form action={removeContent.bind(null, r.id)}>
                    <Button.Root variant="neutral" mode="stroke" block>Take it down</Button.Root>
                  </form>
                )}
                {r.target_person && (
                  <form action={removeAndBan.bind(null, r.id)}>
                    <Button.Root variant="error" block>{canTakeDown ? "Take it down and ban them" : "Ban them"}</Button.Root>
                  </form>
                )}
                <form action={dismiss.bind(null, r.id)}>
                  <Button.Root variant="neutral" mode="ghost" block>Nothing wrong</Button.Root>
                </form>
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
