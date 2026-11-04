import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { SiteFooter } from "@/components/SiteFooter";
import { AllFree, BrowserOrApp, TheCatch } from "@/components/FreeAndApp";
import * as Alert from "@/components/ui/alert";
import * as Button from "@/components/ui/button";
import { whoIsHere } from "@/lib/viewer";
import { HeroAsk } from "./HeroAsk";

export const metadata: Metadata = { robots: { index: true, follow: true }, alternates: { canonical: "/" } };

const STEPS = [
  { img: "/crew/flag.png", title: "Start a plan", body: "Tell Dibby what, when and where. Not sure where? Say what you're after and Dibby finds three real spots to vote on." },
  { img: "/crew/confetti.png", title: "Drop it in the chat", body: "One link in WhatsApp or wherever. Your mates just tap it. No app, no sign-up." },
  { img: "/crew/trophy.png", title: "See who's in", body: "Your mates tap in or out. Can't pick a day or a spot? Everyone going votes, and the top pick wins." },
  { img: "/crew/coin.png", title: "Square up after", body: "One person pays, it's split for you, and everyone gets their PayID to pay them back. Or, if you're all in, spin the wheel and one person shouts." },
];

/**
 * The front door: what Dibby is, with the chat's first question right in the hero. Typing there
 * opens the chat at /new with it already said, so nobody has to read the page to get started.
 * Signed-in organisers go straight to their plans.
 */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  // If Supabase falls back to the Site URL, the sign-in link lands here: pass it on.
  if (sp.code || sp.token_hash) {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"));
    redirect(`/auth/callback?${q.toString()}`);
  }
  const here = await whoIsHere();
  if (here.organiser && !sp.bye) redirect(here.canOrganise ? "/home" : "/onboarding?next=/new");

  return (
    <main className="page landing">
      <header className="topbar">
        <Wordmark href="/" />
        <AccountButton here={here} />
      </header>

      {sp.bye && (
        <Alert.Root status="success" role="status">
          <Alert.Icon as="i" className="ri-checkbox-circle-line" aria-hidden="true" />
          <div>Your account&rsquo;s deleted. Thanks for planning with Dibby.</div>
        </Alert.Root>
      )}

      <section className="landing__hero">
        <h1 className="title-h2">Everyone&rsquo;s keen. Nobody locks it in.</h1>
        <p className="paragraph-lg muted">Tell Dibby the plan and get the group chat from &ldquo;we should&rdquo; to a day, a spot and who&rsquo;s coming.</p>
        <HeroAsk />
        <p className="landing__free-line label-md">
          <i className="ri-check-double-line db-icon" aria-hidden="true" /> Free for everyone. No app, no sign-up for your mates.
        </p>
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
        <a href="/new">Make a plan, it&rsquo;s free</a>
      </Button.Root>

      <SiteFooter />
    </main>
  );
}
