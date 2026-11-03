import { notFound } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import { currentOrganiser } from "@/lib/auth";
import { usingSupabase } from "@/lib/store";
import { usageReport, type DayUsage } from "@/lib/usage";

export const metadata = { title: "Dibby usage" };
export const dynamic = "force-dynamic";

const RANGES = { "7": "7 days", "30": "30 days", "90": "90 days" } as const;
type Range = keyof typeof RANGES;

/** Same gate as /admin/metrics: an email in METRICS_EMAILS. Anyone signed in, in local demo mode. */
async function allowed(): Promise<boolean> {
  const me = await currentOrganiser();
  if (!me) return false;
  if (!usingSupabase) return true;
  const list = (process.env.METRICS_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return Boolean(me.email && list.includes(me.email.toLowerCase()));
}

const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? "<$0.01" : `$${n.toFixed(n < 1 ? 3 : 2)}`);
const tokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n));

function Bars({ days }: { days: DayUsage[] }) {
  const max = Math.max(...days.map((d) => d.costUsd), 0);
  if (max === 0) return <p className="paragraph-xs muted">No spend in this range yet.</p>;
  return (
    <div className="flex h-28 items-end gap-px" role="img" aria-label="Daily AI cost">
      {days.map((d) => (
        <div
          key={d.day}
          title={`${d.day}: ${usd(d.costUsd)} · ${d.mentions} @dibby`}
          className="flex-1 rounded-t-sm bg-primary-base"
          style={{ height: `${Math.max(2, (d.costUsd / max) * 100)}%`, opacity: d.costUsd ? 1 : 0.2 }}
        />
      ))}
    </div>
  );
}

/**
 * Dibby's AI spend: real tokens and cost from Anthropic, split across the @dibby messages that
 * caused them, charged to whoever wrote the @ and rolled up to the plan and its organiser.
 * Not linked from anywhere.
 */
export default async function Usage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!(await allowed())) notFound();
  const raw = (await searchParams).range;
  const range: Range = raw && raw in RANGES ? (raw as Range) : "30";
  const r = await usageReport(Number(range));
  const t = r.totals;
  const perMention = t.mentions ? (t.costUsd - t.unattributedUsd) / t.mentions : null;

  const tiles = [
    { label: "AI cost (USD)", value: usd(t.costUsd), detail: `${r.model}, from Anthropic` },
    { label: "Per @dibby", value: perMention === null ? "–" : usd(perMention), detail: `${t.mentions} messages tagged Dibby` },
    { label: "Tokens in", value: tokens(t.inputTokens + t.cachedTokens), detail: `${tokens(t.cachedTokens)} read from cache` },
    { label: "Tokens out", value: tokens(t.outputTokens), detail: "Dibby's replies and tool calls" },
  ];

  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/home" />
      </header>
      <section className="section db-stack">
        <h1 className="title-h3">Dibby usage</h1>
        <nav className="chip-row" aria-label="Time range">
          {Object.entries(RANGES).map(([key, label]) => (
            <Button.Root key={key} asChild variant={key === range ? "primary" : "neutral"} mode={key === range ? "filled" : "lighter"} className="flex-none px-4">
              <a href={`?range=${key}`} aria-current={key === range ? "page" : undefined}>
                {label}
              </a>
            </Button.Root>
          ))}
        </nav>
        {r.anthropicError && (
          <div className="db-card">
            <p className="label-sm">Couldn&rsquo;t read Anthropic usage</p>
            <p className="paragraph-xs muted">{r.anthropicError}</p>
            <p className="paragraph-xs muted">
              Set ANTHROPIC_ADMIN_KEY (an Admin key, sk-ant-admin…, from a Console organisation). Message counts below still work; costs show as $0.
            </p>
          </div>
        )}
      </section>

      <section className="metrics-grid" aria-label="Totals">
        {tiles.map((x) => (
          <div key={x.label} className="db-card metric">
            <p className="label-sm muted">{x.label}</p>
            <p className="metric__value">{x.value}</p>
            <p className="paragraph-xs muted">{x.detail}</p>
          </div>
        ))}
      </section>

      <section className="section db-stack">
        <h2 className="label-md">Cost per day (UTC)</h2>
        <Bars days={r.days} />
        {t.unattributedUsd > 0 && (
          <p className="paragraph-xs muted">{usd(t.unattributedUsd)} was spent on days with no @dibby (tests, or another app on the same key), so it isn&rsquo;t charged to anyone.</p>
        )}
      </section>

      <section className="section db-stack">
        <h2 className="label-md">By organiser</h2>
        {r.organisers.length === 0 && <p className="paragraph-sm muted">Nobody&rsquo;s tagged Dibby in this range.</p>}
        {r.organisers.map((o) => (
          <details key={o.key} className="db-card">
            <summary className="flex cursor-pointer items-center justify-between gap-3 py-1">
              <span className="label-md">{o.name}</span>
              <span className="metric__count border-0">
                {usd(o.costUsd)} · {o.mentions}
              </span>
            </summary>
            {o.plans.map((p) => (
              <div key={p.planId} className="mt-3">
                <div className="flex items-baseline justify-between gap-3">
                  {p.slug ? (
                    <a className="paragraph-sm underline" href={`/p/${p.slug}`}>
                      {p.title}
                    </a>
                  ) : (
                    <span className="paragraph-sm muted">{p.title}</span>
                  )}
                  <span className="metric__count border-0">{usd(p.costUsd)}</span>
                </div>
                <table className="metrics-table">
                  <tbody>
                    {p.askers.map((a) => (
                      <tr key={a.memberId}>
                        <th scope="row" className="paragraph-xs">
                          {a.name}
                          {a.guest ? " (guest)" : ""}
                        </th>
                        <td className="metric__count paragraph-xs">
                          {a.mentions} @ · {usd(a.costUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </details>
        ))}
        <p className="paragraph-xs muted">
          Anthropic reports cost per day, not per person, so each day&rsquo;s cost is split evenly across that day&rsquo;s @dibby messages. Nudges and recaps are templates and cost nothing.
        </p>
      </section>
    </main>
  );
}
