import type { Metadata } from "next";
import { Dibby } from "@/components/Dibby";
import * as Button from "@/components/ui/button";
import { previewInvite } from "@/lib/crew-ops";
import { previewMeta } from "@/lib/og";
import { inApp } from "@/lib/beta";

export const dynamic = "force-dynamic";

/**
 * A crew invite link opened in a browser (ARV-98). Crews are app only, so this says who the crew
 * is (ARV-89: name, emoji, how many, who invited you) and sends you to get the app. With the app
 * installed the link opens there instead (universal links, lib/app-links.ts).
 */

// The preview card is generic: no crew name, emoji or count (ARV-89), so a pasted link gives nothing away.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return { ...previewMeta({ title: "You're invited to a crew", description: "Open it in the Dibby app to ask to join.", path: `/c/${token}` }), robots: { index: false, follow: false } };
}

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await previewInvite(token, null).catch(() => ({ status: "expired" as const, crew: undefined, invited_by: undefined }));

  if (p.status !== "ok" || !p.crew)
    return (
      <main className="page page--center">
        <section className="empty">
          <Dibby mood="lost" size="md" />
          <h1 className="title-h3">This invite&rsquo;s expired</h1>
          <p className="muted">Ask whoever sent it for a new one.</p>
          <Button.Root asChild variant="neutral" mode="lighter">
            <a href="/">Go to Dibby</a>
          </Button.Root>
        </section>
      </main>
    );

  const { crew } = p;
  const lead = `${crew.members} ${crew.members === 1 ? "person" : "people"}${p.invited_by ? ` · ${p.invited_by} invited you` : ""}`;
  return (
    <main className="page page--center">
      <section className="empty">
        <span className="crew-invite__emoji" aria-hidden="true">
          {crew.emoji}
        </span>
        <h1 className="title-h3">{crew.name}</h1>
        <p className="paragraph-lg muted">{lead}</p>
        <p className="muted">Crews live in the app. Get it, sign in, then tap Open your invite to ask to join.</p>
        <Button.Root asChild size="large" block>
          <a href={`/app?next=${encodeURIComponent(`/c/${token}`)}`}>Get the Dibby app to join</a>
        </Button.Root>
        {/* Opened in a browser with the app already in (a link pasted into Safari, say): open it there. */}
        <Button.Root asChild variant="neutral" mode="lighter">
          <a href={inApp(`/c/${token}`)}>Got the app? Open it</a>
        </Button.Root>
      </section>
    </main>
  );
}
