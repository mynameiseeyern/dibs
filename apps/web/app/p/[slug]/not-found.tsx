import { Dibby } from "@/components/Dibby";
import * as Button from "@/components/ui/button";
import { currentOrganiser } from "@/lib/auth";
import { SignInHere } from "./SignInHere";

/**
 * A plan link that doesn't open. One page for a wrong or old link and for a crew-only plan you're
 * not in (ARV-89), so it can't tell anyone which links are real. Signed out, it offers sign-in:
 * you might be in the crew on another device.
 */
export default async function PlanNotFound() {
  const me = await currentOrganiser().catch(() => null);
  return (
    <main className="page page--center">
      <section className="empty">
        <Dibby mood="lost" size="md" />
        <h1 className="title-h3">Can&rsquo;t find that one</h1>
        <p className="muted">
          The link might be old, the plan might be just for a crew, or it wrapped up more than 30 days ago. Ask whoever sent it for a fresh one.
        </p>
        {me ? null : (
          <>
            <p className="muted">In the crew? Sign in to see it.</p>
            <SignInHere />
          </>
        )}
        <Button.Root asChild variant="neutral" mode="lighter">
          <a href="/">Go to Dibby</a>
        </Button.Root>
      </section>
    </main>
  );
}
