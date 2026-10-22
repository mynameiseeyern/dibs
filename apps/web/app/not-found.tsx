import { CrewWave } from "@/components/Logo";
import * as Button from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="page page--center">
      <section className="empty">
        <CrewWave />
        <h1 className="title-h3">Can&rsquo;t find that one</h1>
        <p className="muted">The link might be old, or the plan wrapped up more than 30 days ago. Ask whoever sent it for a fresh one.</p>
        <Button.Root asChild variant="neutral" mode="lighter">
          <a href="/">
            Go to dibs
          </a>
        </Button.Root>
      </section>
    </main>
  );
}
