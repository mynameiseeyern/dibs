import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";

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
      <a className="db-btn db-btn--dibs db-btn--lg db-btn--block" href="/new">
        Start a plan
      </a>
      <a className="db-btn db-btn--ghost db-btn--block" href="/home">
        I&rsquo;ve got plans already
      </a>
    </main>
  );
}
