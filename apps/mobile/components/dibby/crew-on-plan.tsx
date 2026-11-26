// A crew plan's crew, at the top of the plan (ARV-93): "🥟 Dumpling Gang · Crew only". Members tap
// it to open the crew. Hosts switch who can see the plan: the crew alone, or anyone with the link.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PlanDetail } from "@dibs/shared/api";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { Choice } from "@/components/dibby/flow";
import { setVisibility } from "@/lib/crews";

export function CrewOnPlan({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const { crew, visibility } = detail;
  if (!crew) return null;
  const who = visibility === "crew" ? "Crew only" : "Anyone with the link";
  const host = Boolean(detail.me?.host);

  async function pick(v: "crew" | "link") {
    if (v === visibility || busy) return;
    setBusy(true);
    try {
      apply(await setVisibility(slug, v));
      toast.success(v === "crew" ? "Crew only now" : "Anyone with the link can join now");
    } catch (e) {
      toast.error("Couldn't change that", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole={crew.member ? "button" : "text"}
        accessibilityLabel={`${crew.name}, ${who}`}
        disabled={!crew.member}
        onPress={() => router.push(`/crews/${crew.id}`)}
        className="flex-row items-center gap-2 self-start rounded-full bg-primary-lighter px-3 py-2 active:opacity-80"
      >
        <Text className="text-[16px] leading-[20px]">{crew.emoji}</Text>
        <Text numberOfLines={1} className="max-w-[220px] text-label-sm text-primary-dark">
          {crew.name}
        </Text>
        <Text className="text-label-sm text-primary-dark">· {who}</Text>
        {crew.member ? <Icon name="arrow-right-s-line" className="text-[16px] leading-[18px] text-primary-dark" /> : null}
      </Pressable>
      {host && visibility ? (
        <View className="gap-2">
          <Text className="text-label-sm text-text-sub-600">Who can see this plan</Text>
          <View className="flex-row flex-wrap gap-2">
            <Choice label="Crew only" selected={visibility === "crew"} onPress={() => pick("crew")} />
            <Choice label="Anyone with the link" selected={visibility === "link"} onPress={() => pick("link")} />
          </View>
          <Text className="text-paragraph-xs text-text-soft-400">
            {visibility === "crew" ? "Only the crew can open the link. Switch to let mates outside the crew join." : "Anyone with the link can join, guests too. Switching back drops anyone not in the crew."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
