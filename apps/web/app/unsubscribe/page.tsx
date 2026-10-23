import { BETA_LIST } from "@dibs/email";
import { Wordmark } from "@/components/Logo";
import { store } from "@/lib/store";
import { UnsubscribeForm } from "./UnsubscribeForm";

export const metadata = { title: "Email settings", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Where the Unsubscribe link in every beta update lands. It asks for one tap instead of
 * unsubscribing on load, because mail scanners open links and would unsubscribe people by accident.
 * No sign-in needed: the token in the link is enough (the Spam Act says it can't need a login).
 */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const token = (await searchParams).t ?? "";
  const sub = token ? await store.getSubscription(BETA_LIST, { token }) : null;

  return (
    <main className="page page--center">
      <header className="topbar">
        <Wordmark />
      </header>
      {sub ? (
        <UnsubscribeForm token={token} email={sub.email} subscribed={sub.subscribed} />
      ) : (
        <section className="db-card section">
          <h1 className="title-h4">That link doesn&rsquo;t work</h1>
          <p className="muted">
            It might be from a test email or it&rsquo;s been cut short. Reply to any Dibby email and we&rsquo;ll take you off the list.
          </p>
        </section>
      )}
    </main>
  );
}
