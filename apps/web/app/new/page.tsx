import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { whoIsHere } from "@/lib/viewer";
import { AskDibby } from "./AskDibby";
import { NewPlanForm } from "./NewPlanForm";

export const metadata = { title: "New plan" };

export default async function NewPlan() {
  const here = await whoIsHere();
  if (!here.organiser) redirect("/login?next=/new");
  if (!here.canOrganise) redirect("/onboarding?next=/new");
  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/home" />
        <AccountButton here={here} />
      </header>
      <h1 className="title-h3">What's the plan?</h1>
      <AskDibby />
      <p className="subheading-sm eyebrow">Or set it up yourself</p>
      <NewPlanForm />
    </main>
  );
}
