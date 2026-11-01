// One option in a plan's vote, ported from `.db-vote` (docs/components/VoteOption.md).
// Tap to vote; the bar along the bottom shows its share. Your pick goes violet; the leader becomes
// a sticker with a lime bar. People who can only read along tap it and get told why instead.

import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { tv } from "@/utils/tv";
import { useShadow } from "@/lib/theme";
import { Icon } from "@/components/ui/icon";

const vote = tv({
  slots: {
    root: "min-h-13 w-full flex-row items-center gap-3 overflow-hidden rounded-md border-[1.5px] border-stroke-soft-200 bg-bg-white-0 px-4 pb-[11px] pt-2 active:scale-[0.98]",
    title: "text-label-md text-text-strong-950",
    meta: "text-paragraph-xs text-text-sub-600",
    count: "font-mono-medium text-[15px] leading-[20px] text-text-sub-600",
    track: "absolute bottom-0 left-0 right-0 h-[3px] bg-bg-soft-200",
    fill: "h-full bg-primary-bar",
  },
  variants: {
    mine: { true: { root: "border-primary-base bg-primary-lighter", count: "text-primary-base" } },
    winning: { true: { root: "border-stroke-sticker bg-bg-sticker", fill: "bg-accent-base" } },
    disabled: { true: { root: "active:scale-100" } },
  },
  compoundVariants: [{ mine: true, winning: true, class: { root: "border-primary-base" } }],
});

type VoteOptionProps = {
  title: string;
  /** A short line under the title: area, price, who added it. */
  meta?: string;
  votes: number;
  /** This option's share of the votes, 0 to 1. */
  share: number;
  /** The viewer's own vote. */
  mine?: boolean;
  winning?: boolean;
  /** Something before the title: a place photo, an icon. */
  leading?: ReactNode;
  /** The vote's closed: shows the tally, can't be tapped. */
  disabled?: boolean;
  /**
   * Set for people who can only read along (maybe, not replied, waitlist). Tapping shows this
   * instead of voting: "You're a maybe, so you can't vote yet."
   */
  readOnlyReason?: string;
  onPress?: () => void;
  className?: string;
};

export function VoteOption({ title, meta, votes, share, mine, winning, leading, disabled, readOnlyReason, onPress, className }: VoteOptionProps) {
  const [why, setWhy] = useState(false);
  const s = vote({ mine: !!mine, winning: !!winning, disabled: !!disabled });
  const clay = useShadow(winning ? "clay" : null);
  const pct = Math.round(Math.max(0, Math.min(1, share)) * 100);
  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!mine, disabled: !!disabled }}
        accessibilityLabel={`${title}, ${votes} ${votes === 1 ? "vote" : "votes"}${mine ? ", your pick" : ""}`}
        disabled={disabled}
        onPress={() => {
          if (readOnlyReason) return setWhy(true);
          Haptics.selectionAsync();
          onPress?.();
        }}
        className={s.root({ class: className })}
        style={clay}
      >
        {leading}
        <View className="flex-1">
          <Text numberOfLines={1} className={s.title()}>
            {title}
          </Text>
          {meta ? (
            <Text numberOfLines={1} className={s.meta()}>
              {meta}
            </Text>
          ) : null}
        </View>
        {mine ? <Icon name="checkbox-circle-fill" className="text-primary-base" /> : null}
        <Text className={s.count()}>{votes}</Text>
        <View className={s.track()}>
          <View className={s.fill()} style={{ width: `${pct}%` }} />
        </View>
      </Pressable>
      {why && readOnlyReason ? <Text className="px-1 text-paragraph-xs text-text-sub-600">{readOnlyReason}</Text> : null}
    </View>
  );
}
