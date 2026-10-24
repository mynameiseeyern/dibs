import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import * as Alert from "@/components/ui/alert";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { robots: { index: true, follow: true }, alternates: { canonical: "/" } };

const STEPS = [
  { img: "/crew/flag.png", title: "Plan it with Dibby", body: "Tag Dibby with the day, the vibe and a budget. It finds real places nearby and drafts the plan." },
  { img: "/crew/trophy.png", title: "Vote and RSVP", body: "Drop the link in the group chat. Everyone votes and says if they're in, no sign-up needed." },
  { img: "/crew/coin.png", title: "Square up after", body: "One person pays, Dibby splits it, everyone gets the PayID details. Or spin card roulette." },
];

// If Supabase falls back to the Site URL, the sign-in link lands here: pass it on.
export default async function Landing({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (sp.code || sp.token_hash) {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"));
    redirect(`/auth/callback?${q.toString()}`);
  }
  return (
    <main className="page landing">
      {sp.bye && (
        <Alert.Root status="success" role="status">
          <Alert.Icon as="i" className="ri-checkbox-circle-line" aria-hidden="true" />
          <div>Your account&rsquo;s deleted. Thanks for planning with Dibby.</div>
        </Alert.Root>
      )}
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
          <a href="/new">Start a plan</a>
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
