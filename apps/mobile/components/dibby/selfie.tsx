// The top of a plan page while it's voting or locked in (the web's SelfieBanner.tsx and
// PlanTicket.tsx, same look): a group selfie, then the plan as a ticket.
//
// The selfie: a violet camera screen with the crew squeezed in, tilted and bobbed like a real
// group shot, friendly "?" faces in the spots still free, and Dibby photobombing from the bottom
// right. A line under them fits the moment ("Just one so far. Squeeze in!", "Full house!"). When
// someone's joined since you last looked, the camera flashes. Works for any kind of plan.
//
// The ticket: the title and who's hosting on top, a perforated tear line, then When / Where /
// Going as stubs underneath.

import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";
import { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import * as Avatar from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { useColour, useShadow } from "@/lib/theme";
import { MotionView } from "@/lib/motion";
import { monogram } from "@dibs/shared/plans";
import { DIBBY } from "./flow";

type Person = { name: string; colour: Avatar.AvatarRootProps["color"] };

/** How each face sits in the shot, left to right: a little up or down, a little tilted. */
const POSE = [
  { y: 10, r: -8 },
  { y: -8, r: 5 },
  { y: 4, r: -3 },
  { y: -12, r: 7 },
  { y: 8, r: -6 },
];
const MOST = 5;

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

/** What the selfie says under the faces. */
function caption(going: number, capacity: number | null) {
  if (capacity !== null && going >= capacity) return "Full house!";
  if (going <= 1) return "Just one so far. Squeeze in!";
  return `${going} in. Squeeze in!`;
}

function Pop({ delay, children }: { delay: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const s = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) s.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 200 }));
  }, [delay, reduce, s]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value * 2), transform: [{ scale: 0.4 + s.value * 0.6 }] }));
  return <MotionView style={style}>{children}</MotionView>;
}

/**
 * `crew`: who's in, you (or the host) first, then everyone else. `isYou`: the first face is
 * you, so it says "You". `slug`: to remember how many were in last time, for the flash.
 */
export function SelfieBanner({ slug, crew, isYou, going, capacity }: { slug: string; crew: Person[]; isYou: boolean; going: number; capacity: number | null }) {
  const reduce = useReducedMotion();
  const flash = useSharedValue(0);
  const shadow = useShadow("clay");
  const white = useColour("static-white");

  // The faces in the shot: you in the middle, the crew either side, "+N" if there are more, then
  // "?" for spots still free (up to the plan's limit, if it has one).
  const room = Math.min(MOST, capacity ?? MOST);
  const people = crew.slice(0, crew.length > room ? room - 1 : room);
  const more = crew.length - people.length;
  type Face = { kind: "person"; p: Person; you: boolean } | { kind: "more"; n: number } | { kind: "free" };
  const faces: Face[] = people.map((p, i) => ({ kind: "person", p, you: isYou && i === 0 }));
  if (more > 0) faces.push({ kind: "more", n: more });
  while (faces.length < Math.max(room, 3)) faces.push({ kind: "free" });
  // You (or the host) in the middle: the rest fan out to either side.
  const order: Face[] = [];
  faces.forEach((f, i) => (i % 2 ? order.push(f) : order.unshift(f)));
  if (faces.length % 2 === 0) order.push(order.shift()!);

  // The flash: when more people are in than last time you looked at this plan.
  useEffect(() => {
    const key = `dibs.selfie.${slug.replace(/[^\w.-]/g, "")}`;
    SecureStore.getItemAsync(key)
      .then((seen) => {
        if (seen !== null && Number(seen) < going && !reduce) {
          flash.value = withDelay(500, withSequence(withTiming(0.85, { duration: 60 }), withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) })));
        }
        return SecureStore.setItemAsync(key, String(going));
      })
      .catch(() => {});
  }, [slug, going, reduce, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const face = (f: Face, i: number) => {
    const pose = POSE[i % POSE.length];
    const look = { transform: [{ translateY: pose.y }, { rotate: `${pose.r}deg` }] };
    return (
      <View key={i} style={[{ marginHorizontal: -2 }, look]}>
        <Pop delay={80 + i * 90}>
          {f.kind === "free" ? (
            <View className="size-14 items-center justify-center rounded-full border-2 border-dashed border-static-white/50 bg-static-white/10">
              <Text className="font-display text-[24px] leading-[28px] text-static-white/80">?</Text>
            </View>
          ) : (
            <View className="rounded-full border-[3px] border-static-white">
              <Avatar.Root size={f.kind === "person" && f.you ? "64" : "56"} color={f.kind === "person" ? f.p.colour : "gray"}>
                {f.kind === "more" ? `+${f.n}` : f.you ? <Text className={`font-display text-[18px] leading-[22px] ${YOU_INK[f.p.colour ?? "violet"] ?? "text-primary-darker"}`}>You</Text> : monogram(f.p.name)}
              </Avatar.Root>
            </View>
          )}
        </Pop>
      </View>
    );
  };

  return (
    <View
      className="h-[232px] overflow-hidden rounded-[28px] bg-primary-base"
      style={shadow}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Group selfie: ${going} ${going === 1 ? "person" : "people"} in. ${caption(going, capacity)}`}
    >
      {/* The camera's corner marks. */}
      {(["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"] as const).map((c) => (
        <View key={c} className={`absolute size-5 rounded-[3px] border-static-white/60 ${c}`} />
      ))}
      <View className="absolute left-6 right-6 top-5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="size-2 rounded-full bg-error-base" />
          <Text className="text-[11px] font-sans-bold leading-[14px] tracking-[1.5px] text-static-white">REC</Text>
        </View>
        <View className="rounded-full bg-static-white/20 px-2.5 py-0.5">
          <Text className="text-[12px] font-sans-semibold leading-[16px] text-static-white">{going} in</Text>
        </View>
      </View>

      {/* The faces, with room on the right for Dibby. */}
      <View className="absolute inset-x-0 top-[60px] flex-row items-center justify-center pr-12">{order.map(face)}</View>

      <View className="absolute bottom-5 left-6 right-28">
        <Text className="text-[15px] font-sans-semibold leading-[20px] text-static-white">{caption(going, capacity)}</Text>
      </View>

      {/* Dibby photobombing from the bottom right, waving, cut off by the frame. */}
      <Image source={DIBBY.wave} style={{ position: "absolute", right: -26, bottom: -46, width: 150, height: 150, transform: [{ rotate: "-8deg" }] }} contentFit="contain" accessible={false} />

      <MotionView pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: white }, flashStyle]} />
    </View>
  );
}

export type TicketStub = { label: string; icon: IconName; main: string; sub?: string | null };

/** The plan as a ticket: title and host on top, a tear line, When / Where / Going below. */
export function PlanTicket({ title, hostedBy, description, stubs }: { title: string; hostedBy: string | null; description?: string | null; stubs: TicketStub[] }) {
  const shadow = useShadow("clay-sm");
  return (
    <MotionView entering={FadeIn.delay(250).duration(360)}>
      <View className="overflow-hidden rounded-[24px] border border-stroke-soft-200 bg-bg-white-0" style={shadow}>
        <View className="gap-1 px-5 pb-4 pt-5">
          <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
            {title}
          </Text>
          {hostedBy ? <Text className="text-paragraph-md text-text-sub-600">{hostedBy}</Text> : null}
          {description ? <Text className="pt-1 text-paragraph-sm text-text-strong-950">{description}</Text> : null}
        </View>

        {/* The tear line: a notch cut out of each side, dashes between. */}
        <View className="h-6 justify-center" accessible={false}>
          <View className="mx-5 border-t-2 border-dashed border-stroke-soft-200" />
          <View className="absolute -left-3 size-6 rounded-full border border-stroke-soft-200 bg-bg-weak-50" />
          <View className="absolute -right-3 size-6 rounded-full border border-stroke-soft-200 bg-bg-weak-50" />
        </View>

        <View className="flex-row flex-wrap gap-y-4 px-5 pb-5 pt-3">
          {stubs.map((s) => (
            <View key={s.label} className="w-1/3 gap-0.5 pr-2" accessible accessibilityLabel={`${s.label}: ${s.main}${s.sub ? `, ${s.sub}` : ""}`}>
              <View className="flex-row items-center gap-1">
                <Icon name={s.icon} className="text-[13px] leading-[16px] text-text-soft-400" />
                <Text className="text-[11px] font-sans-bold uppercase leading-[16px] tracking-[1px] text-text-soft-400">{s.label}</Text>
              </View>
              <Text className="text-[16px] font-sans-bold leading-[21px] text-text-strong-950">{s.main}</Text>
              {s.sub ? <Text className="text-[13px] leading-[18px] text-text-sub-600">{s.sub}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    </MotionView>
  );
}
