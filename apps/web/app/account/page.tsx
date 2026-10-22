import { Wordmark } from "@/components/Logo";
import { Monogram } from "@/components/Monogram";
import { BETA_LIST } from "@dibs/email";
import { store, usingSupabase } from "@/lib/store";
import { whoIsHere } from "@/lib/viewer";
import { store } from "@/lib/store";
import { formatAud, rouletteTally } from "@dibs/shared/bills";
import { forgetDeviceAction, signOutAction, switchAccountAction } from "../actions";
import { KeepPlansForm } from "./KeepPlansForm";
import { BetaUpdatesToggle } from "./BetaUpdatesToggle";

export const metadata = { title: "You" };
export const dynamic = "force-dynamic";

export default async function Account() {
  const here = await whoIsHere();
  const { organiser, guest, name } = here;
  // Fails soft so the page still works if the mailing_list migration hasn't run yet.
  const betaUpdates = organiser ? await store.getSubscription(BETA_LIST, { userId: organiser.id }).catch(() => null) : null;

  // Lifetime roulette record: every spun bill on every plan you're on, counted for your member id there.
  const memberships = [...(organiser ? await store.listPlansForUser(organiser.id) : []), ...(guest ? await store.listPlansForGuest(guest.id) : [])];
  const record = { played: 0, lost: 0, paidCents: 0 };
  for (const { plan, member } of memberships) {
    const bills = (await store.listBills(plan.id)).filter((b) => b.split_mode === "roulette" && b.roulette_loser_id);
    const mine = rouletteTally(bills).find((r) => r.memberId === member.id);
    if (mine) {
      record.played += mine.played;
      record.lost += mine.lost;
      record.paidCents += mine.paidCents;
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/home" />
      </header>

      {!name ? (
        <section className="section">
          <h1 className="title-h3">You&rsquo;re not signed in</h1>
          <p className="muted">Sign in to see your plans, or open a plan link from the group chat.</p>
          <a className="db-btn db-btn--primary db-btn--lg db-btn--block" href="/login?next=/home">
            Sign in
          </a>
        </section>
      ) : (
        <section className="db-card section account-who">
          <Monogram name={name} colour="violet" size="lg" />
          <div>
            <h1 className="title-h4">{name}</h1>
            <p className="paragraph-sm muted">
              {organiser ? (organiser.email ?? "Signed in") : "Guest on this browser, no account"}
            </p>
          </div>
        </section>
      )}

      {record.played > 0 && (
        <section className="db-card section account-record" aria-labelledby="rec-h">
          <h2 id="rec-h" className="subheading-sm eyebrow">Your roulette record</h2>
          <p className="title-h4">
            {record.lost === 0 ? `Dodged ${record.played} ${record.played === 1 ? "spin" : "spins"}` : `Lost ${record.lost} of ${record.played}`}
          </p>
          <p className="paragraph-sm muted">
            {record.lost === 0 ? "Not a cent from a spin. Charmed." : `${formatAud(record.paidCents)} paid from losing spins. ${record.lost === record.played && record.played >= 2 ? "Cursed." : "Could be worse."}`}
          </p>
        </section>
      )}

      {guest && !organiser && (
        <section className="db-card section" aria-labelledby="keep-h">
          <h2 id="keep-h" className="title-h5">Keep your plans on every device</h2>
          <p className="paragraph-sm muted">
            Right now dibs only knows you on this browser. Add your email and your plans come with you to your phone, laptop or the WhatsApp browser.
          </p>
          <KeepPlansForm demo={!usingSupabase} />
        </section>
      )}

      {organiser && (
        <section id="email" className="db-card section" aria-labelledby="email-h">
          <h2 id="email-h" className="title-h5">Emails from dibs</h2>
          <BetaUpdatesToggle initial={betaUpdates?.subscribed ?? false} email={organiser.email} />
        </section>
      )}

      {name && (
        <section className="section">
          <a className="db-btn db-btn--secondary db-btn--block" href="/home">
            <i className="ri-calendar-event-line db-icon" aria-hidden="true" />
            Your plans
          </a>
          {organiser ? (
            <>
              <form action={switchAccountAction}>
                <button className="db-btn db-btn--secondary db-btn--block">
                  <i className="ri-user-shared-line db-icon" aria-hidden="true" />
                  Switch account
                </button>
              </form>
              <form action={signOutAction}>
                <button className="db-btn db-btn--ghost db-btn--block">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <a className="db-btn db-btn--secondary db-btn--block" href="/login?next=/home">
                <i className="ri-login-box-line db-icon" aria-hidden="true" />
                I have an account
              </a>
              <form action={forgetDeviceAction}>
                <button className="db-btn db-btn--ghost db-btn--block">Not {name.split(" ")[0]}? Forget me on this browser</button>
              </form>
            </>
          )}
        </section>
      )}
    </main>
  );
}
