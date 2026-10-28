import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { shareText } from "@dibs/shared/plans";
import { Wordmark } from "@/components/Logo";
import { CopyButton } from "@/components/CopyButton";
import * as Alert from "@/components/ui/alert";
import * as Button from "@/components/ui/button";
import { formatShort, formatWhen, isoToLocal } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { siteUrl } from "@/lib/site";
import { ShareButton } from "../ShareButton";
import { trackShare } from "../actions";
import { Overview } from "./Overview";

export const metadata: Metadata = { title: "Plan's made", robots: { index: false } };

/**
 * The last step of making a plan: it's made, here's the link. Share it to the group chat, or
 * copy it, then Done goes to the plan. Only for the plan's hosts; anyone else goes to the plan.
 */
export default async function Made({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ kept?: string }> }) {
  const { slug } = await params;
  const kept = (await searchParams).kept === "1";
  const view = await loadPlan(slug);
  if (!view) notFound();
  const { plan, isHost } = view;
  if (!isHost || plan.status === "cancelled") redirect(`/p/${slug}`);

  const url = `${siteUrl()}/p/${plan.slug}?v=${plan.version}`;
  const voting = plan.status === "voting";
  const where = plan.venue_name ?? (voting ? `Up for a vote${plan.area ? ` around ${plan.area}` : ""}` : plan.area);
  const text = shareText({
    title: plan.title,
    when: formatShort(plan.starts_at),
    place: plan.venue_name ?? plan.area,
    voting,
    deadline: formatShort(plan.vote_deadline),
    url,
  });

  return (
    <main className="page made">
      <header className="topbar">
        <Wordmark href="/" />
      </header>

      <section className="made__hero" aria-labelledby="made-h">
        <span className="made__badge" aria-hidden="true">
          <i className="ri-check-line db-icon" />
        </span>
        <h1 id="made-h" className="title-h3">
          It&rsquo;s on.
        </h1>
        <p className="paragraph-sm muted">Drop the link in the group chat. Your crew taps it to vote and say if they&rsquo;re in, no app or account needed.</p>
      </section>

      {kept && (
        <Alert.Root status="success" role="status">
          <Alert.Icon as="i" className="ri-mail-check-line" aria-hidden="true" />
          <div>Check your email for a link to keep this plan on any device.</div>
        </Alert.Root>
      )}

      <Overview
        slug={slug}
        title={plan.title}
        whenLocal={isoToLocal(plan.starts_at)}
        whenLabel={formatWhen(plan.starts_at)}
        where={where}
        whereNote={voting ? ["Anyone going adds places", plan.vote_deadline ? `closes ${formatShort(plan.vote_deadline)}` : null].filter(Boolean).join(" · ") : null}
        placeSet={Boolean(plan.venue_name) && !voting}
        description={plan.description ?? null}
      />

      <div className="flex flex-col gap-2">
        <span className="label-sm" id="link-l">
          The link
        </span>
        <div className="made__link" aria-labelledby="link-l">
          <span className="made__url">{url.replace(/^https?:\/\//, "").replace(/\?v=\d+$/, "")}</span>
          <CopyButton value={url} label="the link" />
        </div>
      </div>

      <div className="dock">
        <div className="dock__inner">
          <ShareButton label="Share to the group chat" tone="dibs" title={plan.title} url={url} text={text} onShare={trackShare.bind(null, slug, "invite")} />
          <Button.Root asChild variant="neutral" mode="lighter" size="large" block>
            <a href={`/p/${slug}`}>Done</a>
          </Button.Root>
        </div>
      </div>
    </main>
  );
}
