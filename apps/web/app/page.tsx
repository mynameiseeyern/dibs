import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import * as Button from "@/components/ui/button";

export const metadata: Metadata = { robots: { index: true, follow: true }, alternates: { canonical: "/" } };

// If Supabase falls back to the Site URL, the sign-in link lands here: pass it on.
export default async function Landing({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (sp.code || sp.token_hash) {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"));
    redirect(`/auth/callback?${q.toString()}`);
  }
  return (
    <main className="page page--center">
      <LogoMark size={88} title="dibs" />
      <h1 className="title-h2">
        Plans sorted,
        <br />
        money square.
      </h1>
      <p className="muted">
        Get your crew from &ldquo;we should catch up&rdquo; to actually going. Ask Dibby to plan it, share it to the group chat, vote, then
        square up after. Your friends don&rsquo;t need the app.
      </p>
      <Button.Root asChild variant="dibs" size="large" block>
        <a href="/new">
          Start a plan
        </a>
      </Button.Root>
      <Button.Root asChild mode="ghost" block>
        <a href="/home">
          I&rsquo;ve got plans already
        </a>
      </Button.Root>
    </main>
  );
}
