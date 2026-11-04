import type { ReactNode } from "react";
import { Wordmark } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";

/** Shared shell for the privacy policy and terms: plain English. */
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
      <div className="legal__body">{children}</div>
      <SiteFooter />
    </main>
  );
}
