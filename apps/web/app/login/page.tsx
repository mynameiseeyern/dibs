import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { currentOrganiser } from "@/lib/auth";
import { usingSupabase } from "@/lib/store";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? "/home";
  if (await currentOrganiser()) redirect(next);
  return (
    <main className="page page--center">
      <Wordmark />
      <h1 className="title-h3">Sign in to organise</h1>
      <p className="muted">
        {usingSupabase ? "We'll email you a link. No password needed." : "Demo mode: Supabase isn't set up yet, so you'll go straight in."}
      </p>
      <LoginForm next={next} demo={!usingSupabase} />
    </main>
  );
}
