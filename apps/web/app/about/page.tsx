import type { Metadata } from "next";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "About", robots: { index: true, follow: true }, alternates: { canonical: "/about" } };

const STEPS = [
  { img: "/crew/flag.png", title: "Plan it with Dibby", body: "Tag Dibby with the day, the vibe and a budget. It finds real places nearby and drafts the plan." },
  { img: "/crew/trophy.png", title: "Vote and RSVP", body: "Drop the link in the group chat. Everyone votes and says if they're in, no sign-up needed." },
  { img: "/crew/coin.png", title: "Square up after", body: "One person pays, Dibby splits it, everyone gets the PayID details. Or spin card roulette." },
];

/** What Dibby is and how it works. The home page is the plan form itself. */
export default function About() {
  return (
    <main className="page landing">
      <header className="topbar">
        <Wordmark href="/" />
        <Button.Root asChild mode="ghost" size="small">
          <a href="/home">Your plans</a>
        </Button.Root>
      </header>

      <section className="landing__hero">
        <div className="landing__crew" aria-hidden="true">
          <img src="/crew/violet.png" alt="" width={512} height={512} />
          <img src="/crew/lime.png" alt="" width={512} height={512} />
          <img src="/crew/sun.png" alt="" width={512} height={512} />
        </div>
        <h1 className="title-h2">
          Plans sorted,
          <br />
          money square.
        </h1>
        <p className="muted">
          Get your crew from &ldquo;we should catch up&rdquo; to actually going. Your friends don&rsquo;t need the app, just the link.
        </p>
        <Button.Root asChild variant="dibs" size="large" block>
          <a href="/">Start a plan</a>
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

      <section className="landing__soon" aria-label="iPhone app">
        <i className="ri-smartphone-line db-icon" aria-hidden="true" />
        <p className="paragraph-sm">
          <strong>Coming soon to the App Store.</strong> Until then it works in your phone&rsquo;s browser, nothing to install.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
