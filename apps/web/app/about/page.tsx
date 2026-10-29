import type { Metadata } from "next";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { AccountButton } from "@/components/AccountButton";
import { whoIsHere } from "@/lib/viewer";
import { AllFree, BrowserOrApp, TheCatch } from "@/components/FreeAndApp";

export const metadata: Metadata = { title: "About", robots: { index: true, follow: true }, alternates: { canonical: "/about" } };

const STEPS = [
  { img: "/crew/flag.png", title: "Start a plan", body: "Say what, when and where. Not sure where? Tell Dibby what you're after and it finds three real spots to vote on." },
  { img: "/crew/confetti.png", title: "Drop it in the chat", body: "One link in WhatsApp or wherever. Your mates just tap it. No app, no sign-up." },
  { img: "/crew/trophy.png", title: "See who's in", body: "Your mates tap in or out. Can't pick a spot? Everyone going votes, and the top pick wins." },
  { img: "/crew/coin.png", title: "Square up after", body: "One person pays, it's split for you, and everyone gets their PayID to pay them back. Or, if you're all in, spin card roulette and one person shouts." },
];

/** What Dibby is and how it works. The home page is the plan form itself. */
export default async function About() {
  return (
    <main className="page landing">
      <header className="topbar">
        <Wordmark href="/" />
        <AccountButton here={await whoIsHere()} />
      </header>

      <section className="landing__hero">
        <div className="landing__crew" aria-hidden="true">
          <img src="/crew/violet.png" alt="" width={512} height={512} />
          <img src="/crew/lime.png" alt="" width={512} height={512} />
          <img src="/crew/sun.png" alt="" width={512} height={512} />
        </div>
        <h1 className="title-h2">Everyone&rsquo;s keen. Nobody locks it in.</h1>
        <p className="paragraph-lg muted">Get the group chat from &ldquo;we should&rdquo; to a day, a spot and who&rsquo;s coming.</p>
        <p className="landing__free-line label-md">
          <i className="ri-check-double-line db-icon" aria-hidden="true" /> Free for everyone. No app, no sign-up for your mates.
        </p>
        <Button.Root asChild variant="dibs" size="large" block>
          <a href="/">Make plans</a>
        </Button.Root>
      </section>

      <section className="section" aria-labelledby="how-h">
        <h2 id="how-h" className="title-h5">
          How it works
        </h2>
        <ol className="landing__steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="db-card landing__step">
              <img src={s.img} alt="" width={512} height={512} loading="lazy" />
              <div>
                <span className="subheading-xs muted">Step {i + 1}</span>
                <h3 className="label-lg">{s.title}</h3>
                <p className="paragraph-sm muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <AllFree />

      <BrowserOrApp />

      <p className="db-card landing__promise">
        <i className="ri-shield-check-line db-icon" aria-hidden="true" />
        <span className="paragraph-sm">
          <strong>No money goes through Dibby.</strong> Only you and whoever paid see your share. Everyone else just sees &ldquo;4 of 6 settled&rdquo;.
        </span>
      </p>

      <TheCatch />

      <Button.Root asChild variant="primary" size="large" block>
        <a href="/">Make a plan, it&rsquo;s free</a>
      </Button.Root>

      <SiteFooter />
    </main>
  );
}
