import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { currentOrganiser } from "@/lib/auth";
import { usingSupabase } from "@/lib/store";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  browser: "That link opened in a different browser to the one you asked from. Send a new one and open it here, or copy the link into this browser.",
  expired: "That link has expired or was already used. Send a new one.",
  link: "That sign-in link didn't work. Send a new one.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next ?? "/home";
  const problem = sp.error ? ERRORS[sp.error] ?? ERRORS.link : null;
  if (await currentOrganiser()) redirect(next);
  return (
    <main className="page page--center">
      <Wordmark />
      <h1 className="title-h3">Sign in to organise</h1>
      <p className="muted">
        {usingSupabase ? "We'll email you a link. No password needed." : "Demo mode: Supabase isn't set up yet, so you'll go straight in."}
      </p>
      {problem && (
        <div className="db-alert db-alert--warning" role="alert">
          <i className="ri-error-warning-fill db-icon" aria-hidden="true" />
          <div>
            <strong>Let&rsquo;s try that again</strong>
            {problem}
          </div>
        </div>
      )}
      <LoginForm next={next} demo={!usingSupabase} />
    </main>
  );
}
