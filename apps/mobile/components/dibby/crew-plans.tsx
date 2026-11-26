// The crew's plans on its page (ARV-92): Still deciding, Coming up, Past (folded away).

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import type { CrewPlanRow, CrewPlanSections } from "@dibs/shared/crews";
import { Icon } from "@/components/ui/icon";
import { DIBBY } from "@/components/dibby/flow";

const RSVP_WORD: Record<NonNullable<CrewPlanRow["rsvp"]>, string> = { in: "You're in", maybe: "You're a maybe", out: "You can't make it" };

export function CrewPlans({ plans }: { plans: CrewPlanSections }) {
  const [showPast, setShowPast] = useState(false);
  const { still_deciding, coming_up, past } = plans;

  if (still_deciding.length + coming_up.length + past.length === 0)
    return (
      <View className="flex-row items-center gap-3 rounded-lg bg-primary-lighter p-4">
        <Image source={DIBBY.point} style={{ width: 56, height: 56 }} contentFit="contain" accessible={false} />
        <View className="flex-1 gap-0.5">
          <Text className="text-label-md text-text-strong-950">Nothing on yet</Text>
          <Text className="text-paragraph-sm text-text-sub-600">Make the first plan and the whole crew gets it.</Text>
        </View>
      </View>
    );

  return (
    <View className="gap-6">
      {still_deciding.length > 0 ? (
        <Group title="Still deciding">
          {still_deciding.map((p) => (
            <Row key={p.slug} p={p} />
          ))}
        </Group>
      ) : null}
      {coming_up.length > 0 ? (
        <Group title="Coming up">
          {coming_up.map((p) => (
            <Row key={p.slug} p={p} />
          ))}
        </Group>
      ) : null}
      {past.length > 0 ? (
        <View className="gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showPast }}
            onPress={() => setShowPast((s) => !s)}
            className="min-h-11 flex-row items-center gap-1 self-start active:opacity-70"
          >
            <Text className="text-subheading-sm uppercase text-text-soft-400">Past ({past.length})</Text>
            <Icon name={showPast ? "arrow-up-s-line" : "arrow-down-s-line"} className="text-[18px] leading-[20px] text-text-soft-400" />
          </Pressable>
          {showPast ? past.map((p) => <Row key={p.slug} p={p} quiet />) : null}
        </View>
      ) : null}
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-subheading-sm uppercase text-text-soft-400">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ p, quiet }: { p: CrewPlanRow; quiet?: boolean }) {
  const deciding = p.deciding.length === 2 ? "when and where" : p.deciding[0] === "when" ? "the day" : p.deciding[0] === "where" ? "the place" : null;
  const where = p.place ?? (p.deciding.includes("where") ? null : p.area);
  const line = [p.status === "cancelled" ? "Called off" : p.when ?? (p.status === "voting" ? null : "Day to be decided"), where].filter(Boolean).join(" · ");
  const vote = deciding ? (p.voted ? `Voting on ${deciding} · you've voted` : `Voting on ${deciding}`) : null;
  const you = p.host ? "You're hosting" : p.rsvp ? RSVP_WORD[p.rsvp] : p.status === "voting" || p.status === "locked" ? "Not answered yet" : null;
  const needsYou = Boolean(deciding && !p.voted && p.rsvp !== "out") || (!p.rsvp && !p.host && (p.status === "voting" || p.status === "locked"));
  const going = `${p.going} going`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[p.title, line, vote, you, going].filter(Boolean).join(", ")}
      onPress={() => router.push(`/p/${p.slug}`)}
      className={`gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 active:opacity-80 ${quiet ? "opacity-70" : ""}`}
    >
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="flex-1 text-label-md text-text-strong-950">
          {p.title}
        </Text>
        {p.visibility === "link" ? <Icon name="links-line" className="text-[16px] leading-[18px] text-text-soft-400" accessibilityLabel="Anyone with the link" /> : null}
        <Icon name="arrow-right-s-line" className="text-[20px] leading-[22px] text-text-soft-400" />
      </View>
      {line ? <Text className="text-paragraph-sm text-text-sub-600">{line}</Text> : null}
      {vote ? <Text className={`text-paragraph-sm ${p.voted ? "text-text-sub-600" : "text-primary-dark"}`}>{vote}</Text> : null}
      <Text className={`text-paragraph-xs ${needsYou && !vote ? "text-primary-dark" : "text-text-soft-400"}`}>{[you, going].filter(Boolean).join(" · ")}</Text>
    </Pressable>
  );
}
