import type { ReactNode } from "react";
import { Wordmark } from "@/components/Logo";
import * as Alert from "@/components/ui/alert";
import { SiteFooter } from "@/components/SiteFooter";

/** Shared shell for the privacy policy and terms: plain English, marked as drafts until launch. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="page legal">
      <header className="topbar">
        <Wordmark href="/" />
      </header>
      <div className="section">
        <h1 className="title-h3">{title}</h1>
        <p className="paragraph-sm muted">Last updated {updated}</p>
      </div>
      <Alert.Root status="warning">
        <Alert.Icon as="i" className="ri-draft-line" aria-hidden="true" />
        <div>
          <strong>Draft</strong>dibs is in beta. This is a plain-English draft and hasn&rsquo;t had a legal review yet. It&rsquo;ll be finalised before launch.
        </div>
      </Alert.Root>
      <div className="legal__body">{children}</div>
      <SiteFooter />
    </main>
  );
}
