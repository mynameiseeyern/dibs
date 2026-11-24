// The top of a plan page while it's voting or locked in, matching the web's one-page layout
// (app/p/[slug]/page.tsx `onePage`, LockedHero.tsx and the .locked / .plan-facts styles):
// the crew in a row with you (or the host) raised in the middle, the title big and centred,
// "Hosted by", When / Where / Going in two columns, then the round buttons.

import { useEffect, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import * as Avatar from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { useShadow } from "@/lib/theme";
import { cn } from "@/utils/cn";

type Person = { name: string; colour: Avatar.AvatarRootProps["color"] };

// "You" in the face's own label colour (components/ui/avatar.tsx), so it reads on lime as on violet.
const YOU_INK: Record<string, string> = {
  violet: "text-primary-darker",
  lime: "text-static-black",
  sun: "text-away-dark",
  mint: "text-success-dark",
  tangerine: "text-highlighted-dark",
  rose: "text-feature-dark",
  aqua: "text-verified-dark",
  ivory: "text-stable-dark",
  gray: "text-text-sub-600",
};

/** One seat in the crew: pops up from below with a little overshoot, like the web's locked-rise. */
function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(reduce ? 0 : 24);
  const o = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    y.value = withDelay(delay, withSpring(0, { damping: 11, stiffness: 180 }));
    o.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }));
  }, [delay, reduce, y, o]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * The crew row: two seats each side of the raised one (people, then "+N", then empty dashed
 * seats), inner seats bigger than the outer ones, the raised one lifted with a pop shadow.
 */
export function PlanHero({ going, raised, isYou }: { going: Person[]; raised: Person | null; isYou: boolean }) {
  const pop = useShadow("pop");
  const lead = raised ?? going[0] ?? null;
  const others = going.filter((p) => p !== lead);
  const shown = others.slice(0, 3);
  const more = others.length - shown.length;
  type Seat = { kind: "person"; p: Person } | { kind: "more"; n: number } | { kind: "empty" };
  const seats: Seat[] = [...shown.map((p) => ({ kind: "person" as const, p })), ...(more > 0 ? [{ kind: "more" as const, n: more }] : [])];
  while (seats.length < 4) seats.push({ kind: "empty" });
  const left = [seats[2], seats[0]];
  const right = [seats[1], seats[3]];

  const seat = (s: Seat, size: "48" | "56", delay: number, key: string) => (
    <Rise key={key} delay={delay}>
      {s.kind === "empty" ? (
        <View className={cn("rounded-full border-2 border-dashed border-bg-sub-300", size === "56" ? "size-14" : "size-12")} />
      ) : (
        <Avatar.Root size={size} color={s.kind === "person" ? s.p.colour : "gray"} name={s.kind === "person" ? s.p.name : undefined}>
          {s.kind === "more" ? `+${s.n}` : undefined}
        </Avatar.Root>
      )}
    </Rise>
  );

  return (
    <View className="items-center pt-8" accessible={false} importantForAccessibility="no-hide-descendants">
      <View className="flex-row items-end gap-2.5">
        {seat(left[0], "48", 140, "l0")}
        {seat(left[1], "56", 60, "l1")}
        {lead ? (
          <Rise delay={0}>
            <View className="-translate-y-3 rounded-full border-2 border-stroke-strong-950" style={pop}>
              <Avatar.Root size="72" color={lead.colour} name={isYou ? undefined : lead.name}>
                {isYou ? <Text className={`font-display text-[20px] leading-[24px] ${YOU_INK[lead.colour ?? "violet"] ?? "text-primary-darker"}`}>You</Text> : undefined}
              </Avatar.Root>
            </View>
          </Rise>
        ) : null}
        {seat(right[0], "56", 100, "r0")}
        {seat(right[1], "48", 180, "r1")}
      </View>
    </View>
  );
}

export type HeroFact = { label: string; main: string; sub?: string | null };

/** When / Where / Going (and anything else), two to a row: uppercase label, bold line, quieter line. */
export function PlanFacts({ facts }: { facts: HeroFact[] }) {
  return (
    <Animated.View entering={FadeIn.delay(300).duration(360)} className="flex-row flex-wrap gap-y-5">
      {facts.map((f) => (
        <View key={f.label} className="w-1/2 gap-0.5 pr-4" accessible accessibilityLabel={`${f.label}: ${f.main}${f.sub ? `, ${f.sub}` : ""}`}>
          <Text className="text-[13px] font-sans-bold uppercase leading-[16px] tracking-[1px] text-text-soft-400">{f.label}</Text>
          <Text className="text-[18px] font-sans-bold leading-[24px] text-text-strong-950">{f.main}</Text>
          {f.sub ? <Text className="text-[15px] leading-[22px] text-text-sub-600">{f.sub}</Text> : null}
        </View>
      ))}
    </Animated.View>
  );
}

/** A round button with its label under it (.circle-action). `dibs`: the lime one, for Share. */
export function CircleAction({ icon, label, onPress, dibs, badge }: { icon: IconName; label: string; onPress: () => void; dibs?: boolean; badge?: number }) {
  const shadow = useShadow(dibs ? "pop" : "clay-sm");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} new` : label} onPress={onPress} className="min-w-16 items-center gap-1.5 active:opacity-80">
      <View
        className={cn("size-12 items-center justify-center rounded-full", dibs ? "border-2 border-static-black bg-accent-base" : "bg-bg-soft-200")}
        style={shadow}
      >
        <Icon name={icon} className={dibs ? "text-[22px] leading-[22px] text-static-black" : "text-[22px] leading-[22px] text-text-strong-950"} />
        {badge ? (
          <View className="absolute -right-1 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg-white-0 bg-primary-base px-1">
            <Text className="text-[11px] font-sans-semibold leading-[14px] text-static-white">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[12px] font-sans-semibold leading-[16px] text-text-sub-600">{label}</Text>
    </Pressable>
  );
}
