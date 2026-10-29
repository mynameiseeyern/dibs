import type { Metadata } from "next";
import { Wordmark } from "@/components/Logo";
import * as Button from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { AccountButton } from "@/components/AccountButton";
import { AllFree, BrowserOrApp, TheCatch } from "@/components/FreeAndApp";
import { currentOrganiser } from "@/lib/auth";
import { whoIsHere } from "@/lib/viewer";
import { AppWaitlist } from "./AppWaitlist";

export const metadata: Metadata = {
  title: "The app",
  description: "The Dibby app is coming to the App Store. Free, like everything else.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/app" },
};
export const dynamic = "force-dynamic";

/**
 * Where every "Get the Dibby app" goes. Until it's in the App Store this is a waitlist on the
 * opt-in beta list; when it ships, the store badge and a QR code for desktop go here instead.
 */
export default async function AppPage() {
  const [here, me] = await Promise.all([whoIsHere(), currentOrganiser()]);
  return (
    <main className="page landing">
      <header className="topbar">
        <Wordmark href="/" />
        <AccountButton here={here} />
      </header>

      <section className="landing__hero">
        <span className="landing__badge label-sm app-hero__status">
          <i className="ri-time-line db-icon" aria-hidden="true" /> Coming to the App Store
        </span>
        <h1 className="title-h2">The app&rsquo;s on its way. Still free.</h1>
        <p className="paragraph-lg muted">
          Notifications, every plan in one spot, and saved crews for the group you&rsquo;re always organising. Everything else already works right here in
          your browser.
        </p>
        <AppWaitlist signedIn={Boolean(me)} />
        <Button.Root asChild variant="neutral" mode="lighter" size="large" block>
          <a href="/">Make a plan now</a>
        </Button.Root>
      </section>

      <BrowserOrApp appLink={false} />

      <AllFree />

      <TheCatch />

      <SiteFooter />
    </main>
  );
}
