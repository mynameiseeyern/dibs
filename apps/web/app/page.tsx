import { LogoMark } from "@/components/Logo";

export default function Landing() {
  return (
    <main className="page page--center">
      <LogoMark size={88} title="dibs" />
      <h1 className="hero-title">
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
