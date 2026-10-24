import { notFound, redirect } from "next/navigation";
import { formatAud, netDebts } from "@dibs/shared/bills";
import type { Bill, BillShare, PlanMember } from "@dibs/shared/types";
import { CopyButton } from "@/components/CopyButton";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Monogram } from "@/components/Monogram";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";
import { addBill, confirmPaid, saysPaid, settleNet, spin, toggleSpin } from "./actions";
import { AddBill } from "./AddBill";
import { Wheel } from "./Wheel";
import { RouletteResult } from "./RouletteResult";
import { OptIn } from "./OptIn";
import { rouletteTally } from "@dibs/shared/bills";
import { Once } from "@/components/moments/Once";
import { ShareButton } from "../ShareButton";
import { ActionForm } from "@/components/ActionForm";
import { HAPTICS } from "@/lib/haptics";
import { trackShare } from "../actions";
import { siteUrl } from "@/lib/site";
import { OWE_REMIND_AFTER_MS, OWE_REMIND_AGAIN_MS, TELL_PAYER_AFTER_MS } from "@/lib/nudges";
import { allSquare, oweReminder, tellPayer } from "@/lib/copy";
import * as Button from "@/components/ui/button";
import * as Alert from "@/components/ui/alert";
import * as Badge from "@/components/ui/badge";
import * as Hint from "@/components/ui/hint";
import * as ProgressBar from "@/components/ui/progress-bar";
import { planPreview } from "@/lib/plan-preview";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return planPreview((await params).slug, { label: "Square up", path: "/bills", blurb: "See your share and square up. Balances stay private." });
}
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
      <Button.Root asChild variant="neutral" mode="lighter" iconOnly>
        <a href={`/p/${slug}`} aria-label="Back to the plan">
          <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
        </a>
      </Button.Root>
      {me?.role === "organiser" && (
        <Button.Root asChild mode="ghost" size="small">
          <a href={`/p/${slug}/wrap`}>Edit who came</a>
        </Button.Root>
      )}
    </header>
  );

  // Bills and PayIDs are only for people confirmed at wrap-up.
  if (!me?.attended) {
    return (
      <main className="page">
        {back}
        <Alert.Root status="information" role="status">
          <Alert.Icon as="i" className="ri-lock-2-fill" aria-hidden="true" />
          <div><strong>Bills are just for people who came</strong>If you were there, ask {members.find((m) => m.role === "organiser")?.display_name.split(" ")[0] ?? "the organiser"} to tick you in.</div>
        </Alert.Root>
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
  const tally = rouletteTally(spunBills);
  // Members with a DOB on file are checked server-side; guests tick 18+ when they opt in.
  const meProfile = me.user_id ? await store.getProfile(me.user_id) : null;
  const meAdultOnFile = Boolean(meProfile?.dob);

  const payidFor = async (bill: Bill) => {
    if (bill.payid) return { name: bill.payid_name ?? first(bill.payer_member_id), payid: bill.payid };
    const payer = byId.get(bill.payer_member_id);
    const profile = payer?.user_id ? await store.getProfile(payer.user_id) : null;
    return profile?.payid ? { name: `${profile.first_name} ${profile.last_name}`, payid: profile.payid } : null;
  };
  // Netting (ARV-25): when I owe someone and they owe me on different bills, it's one payment.
  const payerOfBill = new Map(bills.map((b) => [b.id, b.payer_member_id]));
  const openShares = owedShares.filter((s) => s.status === "owed");
  const iOweTo = (id: string) => openShares.filter((s) => s.member_id === me.id && payerOfBill.get(s.bill_id) === id);
  const theyOweMe = (id: string) => openShares.filter((s) => s.member_id === id && payerOfBill.get(s.bill_id) === me.id);
  const nettedWith = new Set(
    [...new Set(openShares.filter((s) => s.member_id === me.id).map((s) => payerOfBill.get(s.bill_id)!))].filter((id) => theyOweMe(id).length > 0)
  );
  const billTitle = (id: string) => bills.find((b) => b.id === id)?.title ?? "a bill";
  const netCards = await Promise.all(
    [...nettedWith].map(async (id) => {
      const mine = iOweTo(id);
      const theirs = theyOweMe(id);
      const [d] = netDebts([
        ...mine.map((x) => ({ from: me.id, to: id, cents: x.amount_cents })),
        ...theirs.map((x) => ({ from: id, to: me.id, cents: x.amount_cents })),
      ]);
      const net = !d ? 0 : d.from === me.id ? d.cents : -d.cents;
      return { id, mine, theirs, net, pay: net > 0 ? await payidFor(bills.find((b) => b.id === mine[0]!.bill_id)!) : null };
    })
  );
  // Their confirm row shows the net amount: shares squared off at the moment I said I'd paid.
  const offsetFor = (memberId: string, at: string | null) =>
    at ? shares.filter((x) => x.member_id === me.id && payerOfBill.get(x.bill_id) === memberId && x.confirmed_at === at).reduce((n, x) => n + x.amount_cents, 0) : 0;

  const myPayids = await Promise.all(
    myOwing
      .filter((s) => !nettedWith.has(payerOfBill.get(s.bill_id)!))
      .map(async (s) => ({ share: s, bill: bills.find((b) => b.id === s.bill_id)!, pay: await payidFor(bills.find((b) => b.id === s.bill_id)!) }))
  );
  const ref = `Dibby ${plan.title}`.slice(0, 35);

  // Private money reminders (ARV-24): shown only to the person they're about, never posted.
  const now = Date.now();
  const ageOf = (bill: Bill) => now - Date.parse(bill.created_at);
  const reminderFor = (bill: Bill, share: BillShare) =>
    share.status === "owed" && ageOf(bill) >= OWE_REMIND_AFTER_MS
      ? oweReminder(plan.vibe, formatAud(share.amount_cents), first(bill.payer_member_id), bill.title, ageOf(bill) >= OWE_REMIND_AGAIN_MS)
      : null;
  const stillOwedToMe = iPaid
    .filter((b) => ageOf(b) >= TELL_PAYER_AFTER_MS)
    .flatMap((b) => owedShares.filter((x) => x.bill_id === b.id && x.status === "owed").map((x) => first(x.member_id)));
  const payerNote = stillOwedToMe.length > 0 ? tellPayer(plan.vibe, [...new Set(stillOwedToMe)]) : null;

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

        {tally.length > 0 && (
          <section className="db-card section" aria-labelledby="tally-h">
            <h2 id="tally-h" className="subheading-sm eyebrow">Roulette record</h2>
            <ul className="people">
              {tally.map((r) => {
                const m = byId.get(r.memberId);
                return (
                  <li key={r.memberId} className="person">
                    <Monogram name={m?.display_name ?? "?"} colour={m?.colour ?? "violet"} />
                    <span className="label-md person__name">
                      {first(r.memberId)}
                      {r.memberId === me.id ? " (you)" : ""}
                      <small>
                        {r.lost === 0 ? `Dodged ${r.played} ${r.played === 1 ? "spin" : "spins"}` : `Lost ${r.lost} of ${r.played} · paid ${formatAud(r.paidCents)}`}
                      </small>
                    </span>
                    {r.lost > 0 && <Badge.Root color="warning">{r.lost === r.played && r.played >= 2 ? "Cursed" : "Unlucky"}</Badge.Root>}
                    {r.lost === 0 && r.played >= 2 && <Badge.Root color="success">Charmed</Badge.Root>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {owedShares.length > 0 && (
          <div className="db-stack">
            <Hint.Root>{settled} of {owedShares.length} settled</Hint.Root>
            <ProgressBar.Root color="accent" value={settled} max={owedShares.length} aria-label="Settled" />
          </div>
        )}

        {owedShares.length > 0 && settled === owedShares.length && (
          <section className="moment">
            <Once id={`square:${plan.id}`} kind="square" size={220} label="Everyone's square. The crew celebrates." />
            <Badge.Root color="success"><Badge.Icon as="i" className="ri-checkbox-circle-fill" aria-hidden="true" />All squared up</Badge.Root>
            <p className="muted">{allSquare(plan.vibe)}</p>
            <Button.Root asChild variant="neutral" mode="lighter">
              <a href={`/p/${slug}/recap`}><i className="ri-star-smile-line db-icon" aria-hidden="true" />On to the recap</a>
            </Button.Root>
          </section>
        )}

        {me.role === "organiser" && owedShares.length > 0 && settled < owedShares.length && (
          <ShareButton
            quiet
            label="Update the group"
            onShare={trackShare.bind(null, slug, "bills")}
            title={plan.title}
            url={`${siteUrl()}/p/${slug}/bills`}
            text={`${plan.title}: ${settled} of ${owedShares.length} settled. If you still owe, your amount and the PayID are here 👉 ${siteUrl()}/p/${slug}/bills`}
          />
        )}

        {payerNote && (
          <Alert.Root status="information" role="status">
            <Alert.Icon as="i" className="ri-eye-off-line" aria-hidden="true" />
            <div>{payerNote}</div>
          </Alert.Root>
        )}

        {netCards.map(({ id, mine, theirs, net, pay }) => (
          <section key={id} className="db-card section" aria-label={`Settling up with ${first(id)}`}>
            <span className="db-plan__eyebrow">You and {first(id)} · netted</span>
            <h2 className="title-h4">
              {net > 0 ? <>Pay {first(id)} <span className="money">{formatAud(net)}</span></> : net < 0 ? <>{first(id)} pays you <span className="money">{formatAud(-net)}</span></> : <>You and {first(id)} are square</>}
            </h2>
            <ul className="netting">
              {mine.map((x) => (
                <li key={x.bill_id}><span>You owe {first(id)} for {billTitle(x.bill_id)}</span><span className="money">{formatAud(x.amount_cents)}</span></li>
              ))}
              {theirs.map((x) => (
                <li key={x.bill_id}><span>{first(id)} owes you for {billTitle(x.bill_id)}</span><span className="money">−{formatAud(x.amount_cents)}</span></li>
              ))}
            </ul>
            {net > 0 && pay ? (
              <>
                <div className="payid">
                  <div className="payid__row"><div><span>Pay to</span><strong className="payid__name">{pay.name}</strong></div><CopyButton value={pay.name} label="name" /></div>
                  <div className="payid__row"><div><span>PayID</span><strong>{pay.payid}</strong></div><CopyButton value={pay.payid} label="PayID" /></div>
                  <div className="payid__row"><div><span>Amount</span><strong>{(net / 100).toFixed(2)}</strong></div><CopyButton value={(net / 100).toFixed(2)} label="amount" /></div>
                  <div className="payid__row"><div><span>Reference</span><strong className="payid__name">{ref}</strong></div><CopyButton value={ref} label="reference" /></div>
                </div>
                <p className="paragraph-sm muted">You each paid for something, so it&rsquo;s one payment instead of two. Dibby never touches the money.</p>
                <ActionForm action={settleNet.bind(null, slug, id)} what="that payment" haptic={HAPTICS.paid} block icon="ri-check-line" label={<>I&rsquo;ve paid {first(id)} {formatAud(net)}</>} />
              </>
            ) : net > 0 ? (
              <p className="paragraph-sm muted">{first(id)} hasn&rsquo;t added a PayID yet.</p>
            ) : net === 0 ? (
              <ActionForm action={settleNet.bind(null, slug, id)} what="that" haptic={HAPTICS.paid} block icon="ri-check-double-line" label="It cancels out. Call it square" />
            ) : (
              <p className="paragraph-sm muted">{first(id)} sees the same thing and pays you the difference.</p>
            )}
          </section>
        ))}

        {myPayids.map(({ share, bill, pay }) => (
          <section key={bill.id} className="db-card section" aria-label={`You owe ${first(bill.payer_member_id)}`}>
            <span className="db-plan__eyebrow">{bill.title}</span>
            <h2 className="title-h4">You owe {first(bill.payer_member_id)} <span className="money">{formatAud(share.amount_cents)}</span></h2>
            {reminderFor(bill, share) && (
              <Alert.Root status="information" role="status">
                <Alert.Icon as="i" className="ri-notification-3-line" aria-hidden="true" />
                <div>{reminderFor(bill, share)}</div>
              </Alert.Root>
            )}
            {share.status === "says_paid" ? (
              <>
                <Once id={`paid:${bill.id}:${me.id}`} kind="paid" size={120} label="Paid" />
                <Alert.Root status="success" role="status"><Alert.Icon as="i" className="ri-time-line" aria-hidden="true" /><div><strong>Marked as paid</strong>Waiting on {first(bill.payer_member_id)} to confirm.</div></Alert.Root>
              </>
            ) : pay ? (
              <>
                <div className="payid">
                  <div className="payid__row"><div><span>Pay to</span><strong className="payid__name">{pay.name}</strong></div><CopyButton value={pay.name} label="name" /></div>
                  <div className="payid__row"><div><span>PayID</span><strong>{pay.payid}</strong></div><CopyButton value={pay.payid} label="PayID" /></div>
                  <div className="payid__row"><div><span>Amount</span><strong>{(share.amount_cents / 100).toFixed(2)}</strong></div><CopyButton value={(share.amount_cents / 100).toFixed(2)} label="amount" /></div>
                  <div className="payid__row"><div><span>Reference</span><strong className="payid__name">{ref}</strong></div><CopyButton value={ref} label="reference" /></div>
                </div>
                <p className="paragraph-sm muted">Pay from your banking app. Dibby never touches the money.</p>
                <ActionForm action={saysPaid.bind(null, slug, bill.id)} what="that payment" haptic={HAPTICS.paid} block icon="ri-check-line" label={<>I&rsquo;ve paid {first(bill.payer_member_id)}</>} />
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
              <OptIn action={toggleSpin.bind(null, slug, b.id)} inIt={inIt} needsTick={!meAdultOnFile} />
              {!inIt && !meAdultOnFile && <p className="paragraph-xs muted center">Sit it out and you just pay your share.</p>}
              {isPayer && (
                <form action={spin.bind(null, slug, b.id)}>
                  <Button.Root block disabled={b.roulette_entrants.length < 2}>
                    <i className="ri-refresh-line db-icon" aria-hidden="true" />{b.roulette_entrants.length < 2 ? "Need 2 people to spin" : "Spin it"}
                  </Button.Root>
                </form>
              )}
            </section>
          );
        })}

        {iPaid.filter((b) => !(b.split_mode === "roulette" && !b.roulette_loser_id)).map((b) => (
          <PayerCard key={b.id} slug={slug} bill={b} shares={shares.filter((s) => s.bill_id === b.id && s.member_id !== me.id)} byId={byId} offsetFor={offsetFor} />
        ))}

        {bills.length === 0 && (
          <section className="empty">
            <p className="muted">No bills yet. Whoever paid adds it, and everyone sees what they owe.</p>
          </section>
        )}
      </main>
      <div className="dock">
        <div className="dock__inner">
          <Button.Root asChild size="large" block>
            <a href={`/p/${slug}/bills?add=1`}>
              <i className="ri-add-line db-icon" aria-hidden="true" />I paid for something
            </a>
          </Button.Root>
        </div>
      </div>
    </>
  );
}

function PayerCard({
  slug,
  bill,
  shares,
  byId,
  offsetFor,
}: {
  slug: string;
  bill: Bill;
  shares: BillShare[];
  byId: Map<string, PlanMember>;
  offsetFor: (memberId: string, at: string | null) => number;
}) {
  const square = shares.filter((s) => s.status === "confirmed").length;
  return (
    <section className="db-card db-split" aria-label={`Your bill: ${bill.title}`}>
      <div className="db-split__total">
        <div>
          <div className="db-plan__eyebrow">You paid · {bill.title}</div>
          <div className="db-split__amount">{formatAud(bill.total_cents)}</div>
        </div>
        <Badge.Root color="success"><Badge.Dot />{square} of {shares.length} square</Badge.Root>
      </div>
      {shares.length === 0 && <p className="paragraph-sm muted">Nobody owes you on this one.</p>}
      {shares.map((s) => {
        const m = byId.get(s.member_id);
        return (
          <div key={s.member_id} className="db-split__row">
            {m && <Monogram name={m.display_name} colour={m.colour} size="sm" />}
            <span className="db-split__who">
              {m?.display_name ?? "Someone"}
              <small>
                {s.status === "says_paid"
                  ? offsetFor(s.member_id, s.says_paid_at) > 0
                    ? `Says they've paid ${formatAud(s.amount_cents - offsetFor(s.member_id, s.says_paid_at))}, net of the ${formatAud(offsetFor(s.member_id, s.says_paid_at))} you owed them`
                    : "Says they've paid"
                  : s.status === "confirmed"
                    ? "Paid"
                    : "Owes"}
              </small>
            </span>
            {s.status === "confirmed" ? (
              <Badge.Root color="success"><Badge.Icon as="i" className="ri-check-line" aria-hidden="true" />Square</Badge.Root>
            ) : s.status === "says_paid" ? (
              <ActionForm action={confirmPaid.bind(null, slug, bill.id, s.member_id)} what="that" haptic={HAPTICS.paid} size="small" label="Confirm" ariaLabel={`Confirm ${m?.display_name.split(" ")[0] ?? "they"} paid`} />
            ) : (
              <span className="db-split__owe">{formatAud(s.amount_cents)}</span>
            )}
          </div>
        );
      })}
    </section>
  );
}
