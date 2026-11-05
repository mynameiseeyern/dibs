import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import * as Alert from "@/components/ui/alert";
import { whoIsHere } from "@/lib/viewer";
import { PlanFlow } from "./new/PlanFlow";
import { placesPass } from "@/lib/places-pass";
import type { Organising } from "./new/Organiser";

export const metadata: Metadata = { robots: { index: true, follow: true }, alternates: { canonical: "/" } };


/**
 * Making a plan is the front door: one question a screen, no sign-up. Someone new gets a short
 * intro first; a guest gives their name last, like checking out. What Dibby is lives at /about.
 */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  // If Supabase falls back to the Site URL, the sign-in link lands here: pass it on.
  if (sp.code || sp.token_hash) {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"));
    redirect(`/auth/callback?${q.toString()}`);
  }
  const here = await whoIsHere();
  if (here.organiser && !here.canOrganise) redirect("/onboarding?next=/");
  const who: Organising = here.organiser ? { kind: "account" } : here.guest ? { kind: "guest", name: here.name ?? "you" } : { kind: "new" };

  return (
    <main className="page">
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

      <PlanFlow organising={who} intro={who.kind === "new" && !sp.bye} searchPass={who.kind === "new" ? placesPass() : undefined} />
    </main>
  );
}
