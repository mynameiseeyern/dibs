import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { currentOrganiser } from "@/lib/auth";
import { store } from "@/lib/store";
import { AskDibby } from "./AskDibby";
import { NewPlanForm } from "./NewPlanForm";

export const metadata = { title: "New plan" };

export default async function NewPlan() {
  const me = await currentOrganiser();
  if (!me) redirect("/login?next=/new");
  if (!(await store.getProfile(me.id))) redirect("/onboarding?next=/new");
  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/home" />
      </header>
      <h1 className="title-h3">What's the plan?</h1>
      <AskDibby />
      <p className="eyebrow">Or set it up yourself</p>
      <NewPlanForm />
    </main>
  );
}
