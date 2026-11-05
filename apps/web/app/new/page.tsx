import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { whoIsHere } from "@/lib/viewer";
import { placesPass } from "@/lib/places-pass";
import { PlanChat } from "./PlanChat";
import type { Organising } from "./Organiser";

export const metadata: Metadata = { title: "Make a plan", robots: { index: true, follow: true }, alternates: { canonical: "/new" } };

/**
 * Making a plan: a chat with Dibby, no sign-up. The home page's box sends what you typed here as
 * ?q=, and Dibby picks it up from there. A guest gives their name last, like checking out.
 */
export default async function NewPlan({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const here = await whoIsHere();
  if (here.organiser && !here.canOrganise) redirect("/onboarding?next=/new");
  const who: Organising = here.organiser ? { kind: "account" } : here.guest ? { kind: "guest", name: here.name ?? "you" } : { kind: "new" };
  const q = (sp.q ?? "").slice(0, 200);

  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/" />
        <AccountButton here={here} />
      </header>
      <PlanChat organising={who} initialAsk={q || undefined} searchPass={who.kind === "new" ? placesPass() : undefined} />
    </main>
  );
}
