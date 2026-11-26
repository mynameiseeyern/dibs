import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { whoIsHere } from "@/lib/viewer";
import { placesPass } from "@/lib/places-pass";
import { PlanFlow } from "./PlanFlow";
import type { Organising } from "./Organiser";

export const metadata: Metadata = { title: "Make a plan", robots: { index: true, follow: true }, alternates: { canonical: "/new" } };

/**
 * Making a plan: one question a screen, Dibby asking each (PlanFlow, the same as the app), no
 * sign-up. The home page's box sends what you typed here as ?q=, and the flow starts from it.
 * A guest gives their name last, like checking out. (PlanChat, the chat version, is kept but unused.)
 */
export default async function NewPlan({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const here = await whoIsHere();
  if (here.organiser && !here.canOrganise) redirect("/onboarding?next=/new");
  const who: Organising = here.organiser ? { kind: "account" } : here.guest ? { kind: "guest", name: here.name ?? "you" } : { kind: "new" };
  const q = (sp.q ?? "").slice(0, 200);

  return (
    // Full screen, like the app: the flow's own close (top left) goes home.
    <main className="page">
      <PlanFlow organising={who} initialAsk={q || undefined} searchPass={who.kind === "new" ? placesPass() : undefined} />
    </main>
  );
}
