import { Wordmark } from "@/components/Logo";
import { Monogram } from "@/components/Monogram";
import { usingSupabase } from "@/lib/store";
import { whoIsHere } from "@/lib/viewer";
import { forgetDeviceAction, signOutAction, switchAccountAction } from "../actions";
import { KeepPlansForm } from "./KeepPlansForm";

export const metadata = { title: "You" };
export const dynamic = "force-dynamic";

export default async function Account() {
  const here = await whoIsHere();
  const { organiser, guest, name } = here;

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

      {guest && !organiser && (
        <section className="db-card section" aria-labelledby="keep-h">
          <h2 id="keep-h" className="title-h5">Keep your plans on every device</h2>
          <p className="paragraph-sm muted">
            Right now dibs only knows you on this browser. Add your email and your plans come with you to your phone, laptop or the WhatsApp browser.
          </p>
          <KeepPlansForm demo={!usingSupabase} />
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
