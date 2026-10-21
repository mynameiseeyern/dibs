import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { currentOrganiser } from "@/lib/auth";
import { store } from "@/lib/store";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "About you" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? "/new";
  const me = await currentOrganiser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/onboarding?next=${next}`)}`);
  if (await store.getProfile(me.id)) redirect(next);
  return (
    <main className="page">
      <header className="topbar">
        <Wordmark />
      </header>
      <h1 className="title-h3">Quick one first</h1>
      <p className="muted">So your crew knows who's organising, and so they can pay you back.</p>
      <OnboardingForm next={next} />
    </main>
  );
}
