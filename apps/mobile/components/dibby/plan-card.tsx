// The plan card, ported from `.db-plan` (docs/components/PlanCard.md): eyebrow (when), title in the
// display face, facts with icons, then whatever the screen puts in the foot (RSVP, avatars).
// Built on the Card shell as a sticker; a called-off plan drops the sticker and can't be tapped.

import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { PlanStatus } from "@dibs/shared/types";
import { Icon, type IconName } from "@/components/ui/icon";
import * as Card from "./card";
import { StatusPill } from "./status-pill";

export type PlanFact = { icon: IconName; text: string };

type PlanCardProps = {
  /** Usually the day: "Fri 7pm". */
  eyebrow?: string | null;
  title: string;
  /** Time, place, who's coming. Only public facts: an address only for people in the plan. */
  facts?: PlanFact[];
  status?: PlanStatus;
  /** RSVP action, avatars. Left out when the plan's called off. */
  footer?: ReactNode;
  className?: string;
};

const STATUS: Record<Exclude<PlanStatus, "cancelled">, { label: string; tone: "warning" | "success" | "primary"; icon: IconName }> = {
  voting: { label: "Voting", tone: "warning", icon: "hand-heart-line" },
  locked: { label: "Locked in", tone: "success", icon: "check-line" },
  wrapped: { label: "Wrapped", tone: "primary", icon: "flag-line" },
};

export function PlanCard({ eyebrow, title, facts = [], status, footer, className }: PlanCardProps) {
  const off = status === "cancelled";
  const pill = status && !off ? STATUS[status] : null;
  return (
    <Card.Root variant={off ? "default" : "sticker"} className={className} accessibilityState={{ disabled: off }}>
      <View className="flex-row items-center justify-between gap-3">
        {eyebrow ? <Text className="shrink text-subheading-sm uppercase text-primary-dark">{eyebrow}</Text> : <View />}
        {pill ? (
          <StatusPill tone={pill.tone} icon={pill.icon}>
            {pill.label}
          </StatusPill>
        ) : off ? (
          <StatusPill tone="faded">Called off</StatusPill>
        ) : null}
      </View>
      <Text accessibilityRole="header" className={off ? "text-title-h4 text-text-sub-600" : "text-title-h4 text-text-strong-950"}>
        {title}
      </Text>
      {facts.length > 0 ? (
        <View className="gap-2">
          {facts.map((f) => (
            <View key={f.icon + f.text} className="flex-row items-center gap-2">
              <Icon name={f.icon} className="text-text-soft-400" />
              <Text className="shrink text-paragraph-md text-text-sub-600">{f.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {off ? (
        <View className="flex-row items-center gap-2 rounded-md bg-warning-lighter px-3 py-2">
          <Icon name="information-line" className="text-[16px] leading-[16px] text-warning-dark" />
          <Text className="shrink text-paragraph-sm text-warning-dark">This one's off. Nobody owes anything.</Text>
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
