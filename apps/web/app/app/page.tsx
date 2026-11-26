import type { Metadata } from "next";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { AccountButton } from "@/components/AccountButton";
import { AllFree, BrowserOrApp, TheCatch } from "@/components/FreeAndApp";
import { currentOrganiser } from "@/lib/auth";
import { whoIsHere } from "@/lib/viewer";
import { AppWaitlist } from "./AppWaitlist";
import { BetaSteps } from "./BetaSteps";
import { headers } from "next/headers";
import { betaLinks, deviceFrom, safeNext } from "@/lib/beta";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "The app",
  description: "Get the Dibby app. Free, like everything else.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/app" },
};
export const dynamic = "force-dynamic";

/**
 * Where every "Get the Dibby app" goes. While the beta's open (TESTFLIGHT_URL / PLAY_TESTING_URL,
 * lib/beta.ts) it's the steps to get it, with a QR code on a computer; `?next=/c/…` or `/p/…`
 * brings them back to the invite or plan after. Otherwise it's the waitlist on the opt-in beta list.
 */
export default async function AppPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [here, me, sp, h] = await Promise.all([whoIsHere(), currentOrganiser(), searchParams, headers()]);
  const { ios, android } = betaLinks();
  const device = deviceFrom(h.get("user-agent"));
  const next = safeNext(sp.next);
  const beta = Boolean(ios || android);
  // The phone they're on isn't in the beta yet (say, Android before there's a Play test): waitlist for them.
  const onTheirPhone = device === "desktop" ? beta : device === "ios" ? Boolean(ios) : Boolean(android);
  const pageUrl = `${siteUrl()}/app${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <main className="page landing">
      <header className="topbar">
        <Wordmark href="/" />
        <AccountButton here={here} />
      </header>

      {onTheirPhone ? (
        <section className="landing__hero">
          <span className="landing__badge label-sm app-hero__status">
            <i className="ri-flask-line db-icon" aria-hidden="true" /> In beta
          </span>
          <h1 className="title-h2">{next?.startsWith("/c/") ? "Crews live in the app. Jump in." : "The app\u2019s in beta. Jump in."}</h1>
          <p className="paragraph-lg muted">Free, like everything else. Crews, notifications and every plan in one spot.</p>
          <BetaSteps ios={ios} android={android} device={device} next={next} pageUrl={pageUrl} />
        </section>
      ) : (
      <section className="landing__hero">
        <span className="landing__badge label-sm app-hero__status">
          <i className="ri-time-line db-icon" aria-hidden="true" /> {beta ? "Coming to your phone" : "Coming to the App Store"}
        </span>
        <h1 className="title-h2">The app&rsquo;s on its way. Still free.</h1>
        <p className="paragraph-lg muted">
          Notifications, every plan in one spot, and saved crews for the group you&rsquo;re always organising. Everything else already works right here in
          your browser.
        </p>
        <AppWaitlist signedIn={Boolean(me)} />
        <Button.Root asChild variant="neutral" mode="lighter" size="large" block>
          <a href="/new">Make a plan now</a>
        </Button.Root>
      </section>
      )}

      <BrowserOrApp appLink={false} appStatus={ios && android ? "In beta on iPhone and Android" : ios ? "In beta on iPhone, Android soon" : android ? "In beta on Android, iPhone soon" : undefined} />

      <AllFree />

      <TheCatch />

      <SiteFooter />
    </main>
  );
}
