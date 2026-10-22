import { notFound, redirect } from "next/navigation";
import { formatAud } from "@dibs/shared/bills";
import type { Bill, BillShare, PlanMember } from "@dibs/shared/types";
import { CopyButton } from "@/components/CopyButton";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Monogram } from "@/components/Monogram";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";
import { addBill, confirmPaid, saysPaid, spin, toggleSpin } from "./actions";
import { AddBill } from "./AddBill";
import { Wheel } from "./Wheel";
import { RouletteResult } from "./RouletteResult";

export const metadata = { title: "Square up" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ add?: string }> };

export default async function Bills({ params, searchParams }: Props) {
  const { slug } = await params;
  const { add } = await searchParams;
  const view = await loadPlan(slug);
  if (!view) notFound();
  const { plan, members, me } = view;
  if (plan.status !== "wrapped") redirect(`/p/${slug}`);

  const back = (
    <header className="topbar">
      <a className="db-btn db-btn--secondary db-btn--icon" href={`/p/${slug}`} aria-label="Back to the plan">
        <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
      </a>
      {me?.role === "organiser" && (
        <a className="db-btn db-btn--ghost db-btn--sm" href={`/p/${slug}/wrap`}>Edit who came</a>
      )}
    </header>
  );

  // Bills and PayIDs are only for people confirmed at wrap-up.
  if (!me?.attended) {
    return (
      <main className="page">
        {back}
        <div className="db-alert db-alert--information" role="status">
          <i className="ri-lock-2-fill db-icon" aria-hidden="true" />
          <div><strong>Bills are just for people who came</strong>If you were there, ask {members.find((m) => m.role === "organiser")?.display_name.split(" ")[0] ?? "the organiser"} to tick you in.</div>
        </div>
      </main>
    );
  }

  const [bills, shares] = await Promise.all([store.listBills(plan.id), store.listShares(plan.id)]);
  const byId = new Map(members.map((m) => [m.id, m]));
  const first = (id: string | null) => (id ? byId.get(id)?.display_name.split(" ")[0] ?? "Someone" : "Someone");
  const attendees = members.filter((m) => m.attended);

  // "4 of 6 settled": counts only, never who owes what.
  const owedShares = shares.filter((s) => s.amount_cents > 0 && s.member_id !== bills.find((b) => b.id === s.bill_id)?.payer_member_id);
  const settled = owedShares.filter((s) => s.status === "confirmed").length;

  const myOwing = owedShares.filter((s) => s.member_id === me.id && s.status !== "confirmed");
  const iPaid = bills.filter((b) => b.payer_member_id === me.id);
  const pendingSpins = bills.filter((b) => b.split_mode === "roulette" && !b.roulette_loser_id);
  // Every spun roulette bill stays on the page, newest first. Only the newest gets the big moment.
  const spunBills = bills.filter((b) => b.split_mode === "roulette" && b.roulette_loser_id).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const payidFor = async (bill: Bill) => {
    if (bill.payid) return { name: bill.payid_name ?? first(bill.payer_member_id), payid: bill.payid };
    const payer = byId.get(bill.payer_member_id);
    const profile = payer?.user_id ? await store.getProfile(payer.user_id) : null;
    return profile?.payid ? { name: `${profile.first_name} ${profile.last_name}`, payid: profile.payid } : null;
  };
  const myPayids = await Promise.all(myOwing.map(async (s) => ({ share: s, bill: bills.find((b) => b.id === s.bill_id)!, pay: await payidFor(bills.find((b) => b.id === s.bill_id)!) })));
  const ref = `Dibs ${plan.title}`.slice(0, 35);

  if (add) {
    const profile = me.user_id ? await store.getProfile(me.user_id) : null;
    return (
      <main className="page">
        {back}
        <div className="section"><span className="subheading-sm eyebrow">{plan.title}</span><h1 className="title-h3">Add a bill</h1></div>
        <AddBill action={addBill.bind(null, slug)} people={attendees.map((m) => ({ id: m.id, name: m.display_name }))} needsPayid={!profile?.payid} />
      </main>
    );
  }

  return (
    <>
      <LiveRefresh />
      <main className="page">
        {back}
        <div className="section">
          <span className="subheading-sm eyebrow">{plan.title} · square up</span>
          <h1 className="title-h3">{owedShares.length > 0 && settled === owedShares.length ? "Money square." : "Bills"}</h1>
        </div>

        {spunBills.map((b, i) => (
          <RouletteResult
            key={b.id}
            billId={b.id}
            title={b.title}
            names={b.roulette_entrants.map(first)}
            loserIndex={b.roulette_entrants.indexOf(b.roulette_loser_id!)}
            loserName={first(b.roulette_loser_id)}
            amount={formatAud(b.total_cents)}
            big={i === 0}
          />
        ))}

        {owedShares.length > 0 && (
          <div className="db-stack">
            <div className="db-hint">{settled} of {owedShares.length} settled</div>
            <div className="db-progress db-progress--accent" role="progressbar" aria-valuenow={settled} aria-valuemin={0} aria-valuemax={owedShares.length} aria-label="Settled">
              <span style={{ width: `${(settled / owedShares.length) * 100}%` }} />
            </div>
          </div>
        )}

        {owedShares.length > 0 && settled === owedShares.length && (
          <section className="moment">
            <span className="db-badge db-badge--success"><i className="ri-checkbox-circle-fill db-icon" aria-hidden="true" />All squared up</span>
            <p className="muted">Everyone&rsquo;s paid back. Nice work, crew.</p>
            <a className="db-btn db-btn--secondary" href={`/p/${slug}/recap`}><i className="ri-star-smile-line db-icon" aria-hidden="true" />On to the recap</a>
          </section>
        )}

        {myPayids.map(({ share, bill, pay }) => (
          <section key={bill.id} className="db-card section" aria-label={`You owe ${first(bill.payer_member_id)}`}>
            <span className="db-plan__eyebrow">{bill.title}</span>
            <h2 className="title-h4">You owe {first(bill.payer_member_id)} <span className="money">{formatAud(share.amount_cents)}</span></h2>
            {share.status === "says_paid" ? (
              <div className="db-alert db-alert--success" role="status"><i className="ri-time-line db-icon" aria-hidden="true" /><div><strong>Marked as paid</strong>Waiting on {first(bill.payer_member_id)} to confirm.</div></div>
            ) : pay ? (
              <>
                <div className="payid">
                  <div className="payid__row"><div><span>Pay to</span><strong className="payid__name">{pay.name}</strong></div><CopyButton value={pay.name} label="name" /></div>
                  <div className="payid__row"><div><span>PayID</span><strong>{pay.payid}</strong></div><CopyButton value={pay.payid} label="PayID" /></div>
                  <div className="payid__row"><div><span>Amount</span><strong>{(share.amount_cents / 100).toFixed(2)}</strong></div><CopyButton value={(share.amount_cents / 100).toFixed(2)} label="amount" /></div>
                  <div className="payid__row"><div><span>Reference</span><strong className="payid__name">{ref}</strong></div><CopyButton value={ref} label="reference" /></div>
                </div>
                <p className="paragraph-sm muted">Pay from your banking app. dibs never touches the money.</p>
                <form action={saysPaid.bind(null, slug, bill.id)}><button className="db-btn db-btn--primary db-btn--block"><i className="ri-check-line db-icon" aria-hidden="true" />I&rsquo;ve paid {first(bill.payer_member_id)}</button></form>
              </>
            ) : (
              <p className="paragraph-sm muted">{first(bill.payer_member_id)} hasn&rsquo;t added a PayID yet.</p>
            )}
          </section>
        ))}

        {pendingSpins.map((b) => {
          const inIt = b.roulette_entrants.includes(me.id);
          const isPayer = b.payer_member_id === me.id;
          return (
            <section key={b.id} className="db-card section" aria-label={`Card roulette for ${b.title}`}>
              <span className="db-plan__eyebrow">Card roulette · {b.title}</span>
              <h2 className="title-h4">Loser pays the lot: <span className="money">{formatAud(b.total_cents)}</span></h2>
              <Wheel names={b.roulette_entrants.map(first)} loserIndex={null} mode="idle" />
              <p className="paragraph-sm muted center">
                {b.roulette_entrants.length === 0 ? "Nobody's in yet." : `${b.roulette_entrants.length} in: ${b.roulette_entrants.map(first).join(", ")}`}
              </p>
              <form action={toggleSpin.bind(null, slug, b.id)}>
                <button className={`db-btn db-btn--block ${inIt ? "db-btn--secondary" : "db-btn--dibs"}`}>{inIt ? "Actually, I'm out" : "I'm in"}</button>
              </form>
              {isPayer && (
                <form action={spin.bind(null, slug, b.id)}>
                  <button className="db-btn db-btn--primary db-btn--block" disabled={b.roulette_entrants.length < 2}>
                    <i className="ri-refresh-line db-icon" aria-hidden="true" />{b.roulette_entrants.length < 2 ? "Need 2 people to spin" : "Spin it"}
                  </button>
                </form>
              )}
            </section>
          );
        })}

        {iPaid.filter((b) => !(b.split_mode === "roulette" && !b.roulette_loser_id)).map((b) => (
          <PayerCard key={b.id} slug={slug} bill={b} shares={shares.filter((s) => s.bill_id === b.id && s.member_id !== me.id)} byId={byId} />
        ))}

        {bills.length === 0 && (
          <section className="empty">
            <p className="muted">No bills yet. Whoever paid adds it, and everyone sees what they owe.</p>
          </section>
        )}
      </main>
      <div className="dock">
        <div className="dock__inner">
          <a className="db-btn db-btn--primary db-btn--lg db-btn--block" href={`/p/${slug}/bills?add=1`}>
            <i className="ri-add-line db-icon" aria-hidden="true" />I paid for something
          </a>
        </div>
      </div>
    </>
  );
}

function PayerCard({ slug, bill, shares, byId }: { slug: string; bill: Bill; shares: BillShare[]; byId: Map<string, PlanMember> }) {
  const square = shares.filter((s) => s.status === "confirmed").length;
  return (
    <section className="db-card db-split" aria-label={`Your bill: ${bill.title}`}>
      <div className="db-split__total">
        <div>
          <div className="db-plan__eyebrow">You paid · {bill.title}</div>
          <div className="db-split__amount">{formatAud(bill.total_cents)}</div>
        </div>
        <span className="db-badge db-badge--success db-badge--dot">{square} of {shares.length} square</span>
      </div>
      {shares.length === 0 && <p className="paragraph-sm muted">Nobody owes you on this one.</p>}
      {shares.map((s) => {
        const m = byId.get(s.member_id);
        return (
          <div key={s.member_id} className="db-split__row">
            {m && <Monogram name={m.display_name} colour={m.colour} size="sm" />}
            <span className="db-split__who">
              {m?.display_name ?? "Someone"}
              <small>{s.status === "says_paid" ? "Says they've paid" : s.status === "confirmed" ? "Paid" : "Owes"}</small>
            </span>
            {s.status === "confirmed" ? (
              <span className="db-badge db-badge--success"><i className="ri-check-line db-icon" aria-hidden="true" />Square</span>
            ) : s.status === "says_paid" ? (
              <form action={confirmPaid.bind(null, slug, bill.id, s.member_id)}><button className="db-btn db-btn--primary db-btn--sm">Confirm</button></form>
            ) : (
              <span className="db-split__owe">{formatAud(s.amount_cents)}</span>
            )}
          </div>
        );
      })}
    </section>
  );
}
