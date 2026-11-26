// The plan card, matching the web's `.db-plan` (app/home/page.tsx and the plan page): status and
// category badges on top (with "Hosting" or "Going" on the right on the home screen), the title in
// the display face, an optional "Hosted by" line, then facts with icons (when, where), then the foot.
// Built on the Card shell as a sticker; a called-off plan drops the sticker and can't be tapped.

import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { PlanStatus } from "@dibs/shared/types";
import { categoryIcon } from "@dibs/shared/plans";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/utils/cn";
import * as Card from "./card";
import { StatusPill } from "./status-pill";

export type PlanFact = { icon: IconName; text: string; muted?: boolean };

type PlanCardProps = {
  title: string;
  status?: PlanStatus;
  /** "Food", "Drinks": a badge next to the status, like the web. */
  category?: string | null;
  /** Right of the badges: "Hosting", "Going". */
  meta?: string | null;
  /** Under the title: "Hosted by Ee". */
  byline?: string | null;
  /** The plan page's title is bigger than a row's on the home screen (title-h3 vs title-h4). */
  size?: "page" | "row";
  /** When, then where. Only public facts: an address only for people in the plan. */
  facts?: PlanFact[];
  /** "3 in", a nudge. Left out when the plan's called off. */
  footer?: ReactNode;
  className?: string;
  /** Old prop, before the when moved into the facts. Ignored. */
  eyebrow?: string | null;
  /** A plain card (the web's home rows), not the lavender sticker. */
  plain?: boolean;
  /** The web's chip text for the status, e.g. "Voting · closes Thu 6:15am". */
  statusLabel?: string;
  /** Been and done: a smaller title (20px), like .plan-row--quiet. */
  quiet?: boolean;
};

// The web's status badges (apps/web/lib/status.ts): same words, tones and icons.
const STATUS: Record<Exclude<PlanStatus, "cancelled">, { label: string; tone: "warning" | "success" | "primary"; icon: IconName }> = {
  voting: { label: "Voting", tone: "warning", icon: "time-line" },
  locked: { label: "Locked in", tone: "success", icon: "lock-2-line" },
  wrapped: { label: "Wrapped", tone: "primary", icon: "flag-line" },
};

export function PlanCard({ title, status, category, meta, byline, size = "row", facts = [], footer, className, plain, statusLabel, quiet }: PlanCardProps) {
  const off = status === "cancelled";
  const pill = status && !off ? STATUS[status] : null;
  return (
    <Card.Root variant={off || plain ? "default" : "sticker"} className={className} accessibilityState={{ disabled: off }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="shrink flex-row flex-wrap items-center gap-1.5">
          {pill ? (
            <StatusPill tone={pill.tone} icon={pill.icon}>
              {statusLabel ?? pill.label}
            </StatusPill>
          ) : off ? (
            <StatusPill tone="faded">Called off</StatusPill>
          ) : null}
          {category && !off ? (
            <StatusPill tone="faded" icon={categoryIcon(category).replace(/^ri-/, "") as IconName}>
              {category}
            </StatusPill>
          ) : null}
        </View>
        {meta ? <Text className="text-paragraph-sm text-text-sub-600">{meta}</Text> : null}
      </View>
      <View className="gap-0.5">
        <Text
          accessibilityRole="header"
          className={cn(size === "page" ? "text-title-h3" : quiet ? "text-title-h5" : "text-title-h4", off ? "text-text-sub-600" : "text-text-strong-950")}
        >
          {title}
        </Text>
        {byline ? <Text className="text-paragraph-sm text-text-sub-600">{byline}</Text> : null}
      </View>
      {facts.length > 0 ? (
        <View className="gap-2">
          {facts.map((f) => (
            <View key={f.icon + f.text} className="flex-row items-center gap-2">
              <Icon name={f.icon} className="text-text-soft-400" />
              <Text className={cn("shrink text-paragraph-md", f.muted ? "text-text-soft-400" : "text-text-sub-600")}>{f.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {off ? (
        <View className="flex-row items-center gap-2 rounded-md bg-warning-lighter px-3 py-2">
          <Icon name="close-circle-line" className="text-[16px] leading-[16px] text-warning-dark" />
          <Text className="shrink text-paragraph-sm text-warning-dark">This one&rsquo;s not happening. Nobody owes anything for it.</Text>
        </View>
      ) : footer ? (
        <View className="flex-row flex-wrap items-center justify-between gap-3">{footer}</View>
      ) : null}
    </Card.Root>
  );
}

/** Grey blocks in the card's shape while the plan loads. */
export function PlanCardSkeleton() {
  return (
    <Card.Root accessibilityState={{ busy: true }} accessibilityLabel="Loading the plan">
      <View className="h-5 w-20 rounded-full bg-bg-sub-300" />
      <View className="h-7 w-3/4 rounded-sm bg-bg-sub-300" />
      <View className="h-4 w-1/2 rounded-sm bg-bg-sub-300" />
      <View className="h-4 w-2/3 rounded-sm bg-bg-sub-300" />
    </Card.Root>
  );
}
