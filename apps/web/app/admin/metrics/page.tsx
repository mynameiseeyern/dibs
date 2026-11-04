import { notFound } from "next/navigation";
import { computeGates, computeMetrics, EVENT_NAMES, type Gate, type Rate } from "@dibs/shared/metrics";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import { currentOrganiser } from "@/lib/auth";
import { store, usingSupabase } from "@/lib/store";

export const metadata = { title: "Pilot numbers" };
export const dynamic = "force-dynamic";

const RANGES = { "7": "7 days", "30": "30 days", "90": "90 days", all: "All time" } as const;
type Range = keyof typeof RANGES;

/** Signed in with an email listed in METRICS_EMAILS. Anyone signed in, in local demo mode. */
async function allowed(): Promise<boolean> {
  const me = await currentOrganiser();
  if (!me) return false;
  if (!usingSupabase) return true;
  const list = (process.env.METRICS_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return Boolean(me.email && list.includes(me.email.toLowerCase()));
}

const GATE_LABELS: Record<Gate, { label: string; ask: string }> = {
  keep_plan: { label: "Keep this plan", ask: "organisers without an account sent their email" },
  chat: { label: "Email to chat", ask: "guests sent their email to chat" },
};

const pct = (r: Rate) => (r.rate === null ? "–" : `${Math.round(r.rate * 100)}%`);

/** The pilot's four numbers (ARV-50), from the event log. Not linked from anywhere. */
export default async function Metrics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!(await allowed())) notFound();
  const raw = (await searchParams).range;
  const range: Range = raw && raw in RANGES ? (raw as Range) : "30";
  const since = range === "all" ? new Date(0) : new Date(Date.now() - Number(range) * 86_400_000);
  const events = await store.listEvents(since.toISOString());
  const m = computeMetrics(events);
  const gates = computeGates(events);
  const counts = EVENT_NAMES.map((n) => [n, events.filter((e) => e.name === n).length] as const);

  const tiles = [
    { label: "Plans locked", value: pct(m.plansLocked), detail: `${m.plansLocked.num} of ${m.plansLocked.den} plans reached a decision` },
    { label: "Bills settled in 7 days", value: pct(m.billsSettled), detail: `${m.billsSettled.num} of ${m.billsSettled.den} shares paid within a week` },
    {
      label: "Repeat plans",
      value: m.repeatPlans.perOrganiserMonth === null ? "–" : m.repeatPlans.perOrganiserMonth.toFixed(1),
      detail: `plans per organiser per month · ${pct(m.repeatPlans.repeatShare)} made 2+`,
    },
    { label: "Web to app", value: pct(m.webToApp), detail: `${m.webToApp.num} of ${m.webToApp.den} guests tapped “Get the app”` },
  ];

  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/home" />
      </header>
      <section className="section db-stack">
        <h1 className="title-h3">Pilot numbers</h1>
        <nav className="chip-row" aria-label="Time range">
          {Object.entries(RANGES).map(([key, label]) => (
            <Button.Root key={key} asChild variant={key === range ? "primary" : "neutral"} mode={key === range ? "filled" : "lighter"} className="flex-none px-4">
              <a href={`?range=${key}`} aria-current={key === range ? "page" : undefined}>
                {label}
              </a>
            </Button.Root>
          ))}
        </nav>
      </section>
      <section className="metrics-grid" aria-label="The four numbers">
        {tiles.map((t) => (
          <div key={t.label} className="db-card metric">
            <p className="label-sm muted">{t.label}</p>
            <p className="metric__value">{t.value}</p>
            <p className="paragraph-xs muted">{t.detail}</p>
          </div>
        ))}
      </section>
      <section className="section db-stack" aria-labelledby="gates-h">
        <h2 id="gates-h" className="label-md">Funnel gates</h2>
        <div className="metrics-grid">
          {(Object.keys(GATE_LABELS) as Gate[]).map((g) => (
            <div key={g} className="db-card metric">
              <p className="label-sm muted">{GATE_LABELS[g].label}</p>
              <p className="metric__value">{pct(gates[g])}</p>
              <p className="paragraph-xs muted">{`${gates[g].num} of ${gates[g].den} ${GATE_LABELS[g].ask}`}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <h2 className="label-md">Events logged</h2>
        <table className="metrics-table">
          <tbody>
            {counts.map(([name, n]) => (
              <tr key={name}>
                <th scope="row" className="paragraph-sm">{name.replace(/_/g, " ")}</th>
                <td className="metric__count">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="paragraph-xs muted">IDs and counts only. No names, messages, places or amounts are logged.</p>
      </section>
    </main>
  );
}
