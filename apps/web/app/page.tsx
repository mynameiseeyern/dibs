import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import * as Alert from "@/components/ui/alert";
import { SiteFooter } from "@/components/SiteFooter";
import { whoIsHere } from "@/lib/viewer";
import { store } from "@/lib/store";
import { NewPlanForm } from "./new/NewPlanForm";
import type { Organising } from "./new/Organiser";

export const metadata: Metadata = { robots: { index: true, follow: true }, alternates: { canonical: "/" } };

const STEPS = [
  { icon: "ri-edit-2-line", label: "Make the plan" },
  { icon: "ri-whatsapp-line", label: "Share the link" },
  { icon: "ri-chat-smile-2-line", label: "Dibby chases the crew" },
];

/**
 * The plan form is the front door: make a plan straight away, no sign-up. Name only, like
 * checking out as a guest; an email keeps it. What Dibby is lives at /about.
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
  const profile = here.organiser ? await store.getProfile(here.organiser.id) : null;
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

      <section className="start__hero" aria-labelledby="start-h">
        <h1 id="start-h" className="title-h3">
          What&rsquo;s the plan?
        </h1>
        <p className="paragraph-sm muted">Make it now, share the link in the group chat. Nobody needs the app or an account.</p>
        <ol className="start__steps" aria-label="How it works">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <span className="start__num">{i + 1}</span>
              <i className={`${s.icon} db-icon`} aria-hidden="true" />
              <span className="label-xs">{s.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <NewPlanForm organising={who} savedCategories={profile?.plan_categories ?? []} />

      <SiteFooter />
    </main>
  );
}
