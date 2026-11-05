import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { whoIsHere } from "@/lib/viewer";
import { placesPass } from "@/lib/places-pass";
import { PlanChat } from "../new/PlanChat";
import type { Organising } from "../new/Organiser";

// Not indexed: the form at / is the front door. This is the second version, to try out.
export const metadata: Metadata = { title: "Make a plan", robots: { index: false, follow: false } };

/**
 * Making a plan by chatting with Dibby: a second version of the form at /, to try out. Same
 * questions and checks, posted to the same createPlan. ?q= starts the chat with something
 * already said.
 */
export default async function ChatPlan({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const here = await whoIsHere();
  if (here.organiser && !here.canOrganise) redirect("/onboarding?next=/chat");
  const who: Organising = here.organiser ? { kind: "account" } : here.guest ? { kind: "guest", name: here.name ?? "you" } : { kind: "new" };
  const q = (sp.q ?? "").slice(0, 200);

  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/about" />
        <AccountButton here={here} />
      </header>
      <PlanChat organising={who} initialAsk={q || undefined} searchPass={who.kind === "new" ? placesPass() : undefined} />
    </main>
  );
}
