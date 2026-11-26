import { owedToYou, youOwe } from "@/lib/copy";
import { redirect } from "next/navigation";
import { formatAud } from "@dibs/shared/bills";
import { countIn, wrapState } from "@dibs/shared/plans";
import type { Plan, PlanMember } from "@dibs/shared/types";
import { Wordmark } from "@/components/Logo";
import { Dibby } from "@/components/Dibby";
import { MonogramStack } from "@/components/Monogram";
import { AccountButton } from "@/components/AccountButton";
import { store } from "@/lib/store";
import { dropLostCrewPlans } from "@/lib/crew-plans";
import { formatWhen } from "@/lib/time";
import { whoIsHere } from "@/lib/viewer";
import { planStatus } from "@/lib/status";
import * as Button from "@/components/ui/button";
import * as Badge from "@/components/ui/badge";
import * as Alert from "@/components/ui/alert";
import { answerBetaCard } from "../email-actions";

export const metadata = { title: "Your plans" };
export const dynamic = "force-dynamic";

type Row = {
  plan: Plan;
  me: PlanMember;
  going: PlanMember[];
  inCount: number;
  iOwe: number;
  owedToMe: number;
};

const SIX_HOURS = 6 * 3600 * 1000;

export default async function Home() {
  const here = await whoIsHere();
  const { organiser, guest } = here;
  if (!organiser && !guest) redirect("/login?next=/home");

  // Everything you're on: as your account, plus anything joined as a guest on this browser.
  // Crew-only plans you've been removed from drop off (ARV-97).
  const mine = organiser ? await dropLostCrewPlans(organiser.id, await store.listPlansForUser(organiser.id)) : [];
  const onThisBrowser = guest ? await store.listPlansForGuest(guest.id) : [];
  const seen = new Set(mine.map((r) => r.plan.id));
  const memberships = [...mine, ...onThisBrowser.filter((r) => !seen.has(r.plan.id))];

  const rows: Row[] = await Promise.all(
    memberships.map(async ({ plan, member }) => {
      const [members, bills, shares] = await Promise.all([store.listMembers(plan.id), store.listBills(plan.id), store.listShares(plan.id)]);
      const payerOf = new Map(bills.map((b) => [b.id, b.payer_member_id]));
      const open = shares.filter((s) => s.status !== "confirmed" && s.amount_cents > 0 && s.member_id !== payerOf.get(s.bill_id));
      return {
        plan,
        me: member,
        going: members.filter((m) => m.rsvp === "in" && !m.waitlisted),
        inCount: countIn(members),
        iOwe: open.filter((s) => s.member_id === member.id).reduce((n, s) => n + s.amount_cents, 0),
        owedToMe: open.filter((s) => payerOf.get(s.bill_id) === member.id).reduce((n, s) => n + s.amount_cents, 0),
      };
    })
  );

  const isUpcoming = (r: Row) =>
    (r.plan.status === "voting" || r.plan.status === "locked") && (!r.plan.starts_at || Date.parse(r.plan.starts_at) > Date.now() - SIX_HOURS);
  const upcoming = rows.filter(isUpcoming);
  const squareUp = rows.filter((r) => !isUpcoming(r) && (r.iOwe > 0 || r.owedToMe > 0 || ((r.me.role === "organiser" || r.me.role === "cohost") && wrapState(r.plan) === "ready")));
  const past = rows.filter((r) => !upcoming.includes(r) && !squareUp.includes(r)).reverse().slice(0, 5);

  // ARV-61: ask once, only accounts that have never said yes or no to beta updates.
  const profile = organiser?.email ? await store.getProfile(organiser.id).catch(() => null) : null;
  // Hidden until the 0016 migration adds the column, so an answer always has somewhere to save.
  const askBeta = !!profile && "beta_prompt_answered_at" in profile && !profile.beta_prompt_answered_at;

  const iOwe = rows.reduce((n, r) => n + r.iOwe, 0);
  const owedToMe = rows.reduce((n, r) => n + r.owedToMe, 0);

  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/home" />
        <AccountButton here={here} />
      </header>

      {guest && !organiser && rows.length > 0 && (
        <a className="link-card" href="/account">
          <Alert.Root status="information">
            <Alert.Icon as="i" className="ri-smartphone-line" aria-hidden="true" />
            <div>
              <strong>Only on this browser for now</strong>
              Add your email to see these plans on your other devices.
            </div>
          </Alert.Root>
        </a>
      )}

      {askBeta && (
        <form action={answerBetaCard} className="db-card db-stack" aria-labelledby="beta-card-h">
          <div>
            <h2 id="beta-card-h" className="label-md">
              Want a short email when we ship something new?
            </h2>
            <p className="paragraph-sm muted">Every now and then, never about money. Unsubscribe any time.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button.Root name="answer" value="yes" type="submit">
              Turn on
            </Button.Root>
            <Button.Root name="answer" value="no" type="submit" variant="neutral" mode="lighter">
              No thanks
            </Button.Root>
          </div>
        </form>
      )}

      {/* Only when there's money in play. Nothing owed either way: say nothing. */}
      {(iOwe > 0 || owedToMe > 0) && (
        <section className="balance" aria-label="Your money across plans">
          {iOwe > 0 && (
            <div className="db-card balance__item">
              <span className="paragraph-sm muted">You owe</span>
              <span className="balance__amount">{formatAud(iOwe)}</span>
            </div>
          )}
          {owedToMe > 0 && (
            <div className="db-card balance__item">
              <span className="paragraph-sm muted">Owed to you</span>
              <span className="balance__amount">{formatAud(owedToMe)}</span>
            </div>
          )}
        </section>
      )}

      {upcoming.length === 0 && squareUp.length === 0 ? (
        past.length > 0 ? (
          <section className="section">
            <h1 className="title-h3">Nothing on. Suss.</h1>
            <p className="muted">Start something and drop it in the group chat.</p>
          </section>
        ) : (
          <section className="empty">
            <Dibby mood="look" size="md" />
            <h1 className="title-h3">Nothing on. Suss.</h1>
            <p className="muted">Start something and drop it in the group chat.</p>
          </section>
        )
      ) : null}

      {upcoming.length > 0 && (
        <section className="section" aria-labelledby="up-h">
          <h1 id="up-h" className="title-h3">Up next</h1>
          {upcoming.map((r) => (
            <PlanRow key={r.plan.id} row={r} />
          ))}
        </section>
      )}

      {squareUp.length > 0 && (
        <section className="section" aria-labelledby="sq-h">
          <h2 id="sq-h" className="subheading-sm eyebrow">To sort out</h2>
          {squareUp.map((r) => (
            <PlanRow key={r.plan.id} row={r} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="section" aria-labelledby="past-h">
          <h2 id="past-h" className="subheading-sm eyebrow">Been and done</h2>
          {past.map((r) => (
            <PlanRow key={r.plan.id} row={r} quiet />
          ))}
        </section>
      )}

      <div className="dock">
        <div className="dock__inner">
          <Button.Root asChild variant="dibs" size="large" block>
            <a href="/new">
              <i className="ri-add-line db-icon" aria-hidden="true" /> Start a plan
            </a>
          </Button.Root>
        </div>
      </div>
    </main>
  );
}

function PlanRow({ row, quiet }: { row: Row; quiet?: boolean }) {
  const { plan, me, going, inCount, iOwe, owedToMe } = row;
  const s = planStatus(plan);
  const where = plan.venue_name ?? plan.area;
  // The one thing to do next on this plan, if there is one.
  const nudge =
    iOwe > 0
      ? youOwe(plan.vibe, formatAud(iOwe))
      : owedToMe > 0
        ? owedToYou(plan.vibe, formatAud(owedToMe))
        : (me.role === "organiser" || me.role === "cohost") && wrapState(plan) === "ready"
          ? "Wrap it up: who came?"
          : !me.rsvp && plan.status !== "cancelled" && plan.status !== "wrapped"
            ? "You haven't said if you're in"
            : null;

  return (
    <a href={`/p/${plan.slug}`} className={`db-card db-plan plan-row${quiet ? " plan-row--quiet" : ""}`}>
      <div className="plan-row__top">
        <Badge.Root color={s.tone}>
          <Badge.Icon as="i" className={s.icon} aria-hidden="true" />
          {s.label}
        </Badge.Root>
        <span className="paragraph-sm muted">{me.role === "organiser" ? "Hosting" : me.role === "cohost" ? "Co-hosting" : "Going"}</span>
      </div>
      <h2 className="db-plan__title">{plan.title}</h2>
      <ul className="db-plan__facts">
        {plan.starts_at && (
          <li>
            <i className="ri-calendar-line db-icon" aria-hidden="true" /> {formatWhen(plan.starts_at)}
          </li>
        )}
        {where && (
          <li>
            <i className="ri-map-pin-line db-icon" aria-hidden="true" /> {where}
          </li>
        )}
      </ul>
      <div className="db-plan__foot">
        <MonogramStack people={going} />
        <span className="paragraph-sm muted">{inCount} in</span>
      </div>
      {nudge && (
        <p className="plan-row__nudge">
          <i className="ri-arrow-right-line" aria-hidden="true" /> {nudge}
        </p>
      )}
    </a>
  );
}
