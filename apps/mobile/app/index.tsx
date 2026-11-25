import { AppBar } from "@/components/dibby/app-bar";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, router, Stack, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { CREW_IN_MS, CrewScene, crewArrived } from "@/components/dibby/crew-scene";
import type { MyPlan } from "@dibs/shared/api";
import { DibbyHello, type Anchor } from "@/components/dibby/hello";
import { PushAsk } from "@/components/dibby/push-ask";
import { PlanCard, PlanCardSkeleton, type PlanFact } from "@/components/dibby/plan-card";
import * as Avatar from "@/components/ui/avatar";
import * as AvatarGroup from "@/components/ui/avatar-group";
import * as Button from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import * as LinkButton from "@/components/ui/link-button";
import { getMyPlans } from "@/lib/api";
import { useSession } from "@/lib/session";
import { whenLong } from "@/lib/dates";
import { useColour } from "@/lib/theme";

/**
 * New here: the intro, and one button to make a plan (no account needed). Once you've made or
 * joined a plan (as a guest or signed in): your plans.
 */
export default function Home() {
  const { state, hasGuestPass } = useSession();
  // Still working out who's here: Dibby and the crew, the same as the splash, nothing to tap yet.
  if (state.status === "loading") return <Welcome ready={false} />;
  if (state.status === "signedIn" && state.me && !state.me.name) return <Redirect href="/name" />;
  if (state.status === "signedIn" || hasGuestPass)
    return (
      <>
        <MyPlans signedIn={state.status === "signedIn"} />
        <Intro />
      </>
    );
  return <Welcome ready />;
}

/** Once per launch, whichever screen it's on. */
let introShown = false;

/**
 * Starting the app with plans: Dibby and the crew arrive (carrying on from the splash), then fade
 * away to your plans. Tap to skip. Not at all with Reduce Motion.
 */
function Intro() {
  const reduce = useReducedMotion();
  const page = useColour("bg-weak-50");
  const [gone, setGone] = useState(introShown || reduce);
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const leave = useCallback(() => {
    opacity.value = withTiming(0, { duration: 320 });
    setTimeout(() => setGone(true), 330);
  }, [opacity]);
  useEffect(() => {
    if (gone) return;
    introShown = true;
    const t = setTimeout(leave, (crewArrived() ? 300 : CREW_IN_MS) + 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: page }, style]}>
      <Pressable accessibilityLabel="Skip" style={StyleSheet.absoluteFill} onPress={leave} />
      <CrewScene />
    </Animated.View>
  );
}

const MAKE = "Make plans";

/**
 * New here: Dibby in the middle with the group chat floating around him (carrying on from the splash, so
 * nothing moves when it hides), the name and what it's for under him, and one button to make a plan.
 * `ready` false while we're still working out who's here: just Dibby and the chat.
 */
function Welcome({ ready }: { ready: boolean }) {
  const reduce = useReducedMotion();
  const button = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // The words come in once the crew's arrived (straight away if they already had).
  const after = reduce ? 0 : crewArrived() ? 0 : CREW_IN_MS - 250;

  useEffect(() => {
    introShown = true;
  }, []);

  const start = () => {
    // Dibby comes out from behind the button: measure where it is, then the hello moment plays.
    button.current?.measureInWindow((x, y, width, h) => setAnchor({ x, y, width, height: h }));
  };

  return (
    <View className="flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Dibby steps out of the middle while he climbs out from behind the button instead. */}
      <CrewScene
        hideDibby={Boolean(anchor)}
        below={
          ready ? (
            <Animated.View entering={reduce ? undefined : FadeInDown.duration(420).delay(after)} pointerEvents="none" className="items-center gap-1 px-6">
              <Text accessibilityRole="header" className="font-display text-[44px] leading-[50px] text-text-strong-950">
                dibby
              </Text>
              <Text className="max-w-[260px] text-center text-paragraph-lg text-text-sub-600">Plans that actually happen. Free, no account needed.</Text>
            </Animated.View>
          ) : null
        }
      />
      {ready ? (
        <>
          <Animated.View entering={reduce ? undefined : FadeIn.duration(360).delay(after + 200)} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <SafeAreaView edges={["bottom"]} className="gap-3 p-4">
              <View ref={button} collapsable={false}>
                <Button.Root variant="dibs" size="large" block onPress={start}>
                  {MAKE}
                </Button.Root>
              </View>
              <LinkButton.Root variant="gray" className="self-center" onPress={() => router.push("/open")}>
                Got a plan link? Open it
              </LinkButton.Root>
              <LinkButton.Root variant="gray" className="self-center" onPress={() => router.push("/sign-in")}>
                Got an account? Sign in
              </LinkButton.Root>
            </SafeAreaView>
          </Animated.View>
        </>
      ) : null}
      <DibbyHello
        anchor={anchor}
        label={MAKE}
        onDone={() => {
          router.push("/new");
          // Let the form mount under him before the overlay goes, so there's no gap.
          setTimeout(() => setAnchor(null), 80);
        }}
      />
    </View>
  );
}

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; upcoming: MyPlan[]; sortOut: MyPlan[]; past: MyPlan[] };

function MyPlans({ signedIn }: { signedIn: boolean }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const { setGuestPass } = useSession();
  const fetchPlans = useCallback(async () => {
    try {
      const { upcoming, sort_out, past, claimed } = await getMyPlans();
      setLoad({ kind: "ok", upcoming, sortOut: sort_out ?? [], past });
      // Signed in with a guest pass still here: its plans are on the account now, so drop it.
      if (signedIn && claimed !== undefined) await setGuestPass(null);
    } catch (e) {
      setLoad((prev) => (prev.kind === "ok" ? prev : { kind: "error", message: (e as Error).message }));
    }
  }, [signedIn, setGuestPass]);

  // Fresh every time you come back to it (after opening a plan, say).
  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [fetchPlans])
  );

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
      {/* Our own top bar, not the native header: on iOS 26 the header puts a grey glass bubble
          behind anything in it, which isn't the design (TestFlight, Nov 2026). */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* The web's top bar: logo, and your initials (or ⋯) for the menu. */}
      <AppBar top={false} />
      <ScrollView
        contentContainerClassName="gap-4 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchPlans();
              setRefreshing(false);
            }}
          />
        }
      >
        {!signedIn && load.kind === "ok" && load.upcoming.length + load.sortOut.length + load.past.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push("/sign-in")} className="flex-row gap-3 rounded-lg bg-information-lighter p-4 active:opacity-80">
            <Icon name="smartphone-line" className="text-[20px] leading-[24px] text-information-base" />
            <View className="flex-1 gap-0.5">
              <Text className="text-label-md text-information-base">Only on this phone for now</Text>
              <Text className="text-paragraph-sm text-text-strong-950">Add your email to see these plans on your other devices.</Text>
            </View>
          </Pressable>
        ) : null}
        {load.kind === "ok" && load.upcoming.length > 0 ? <PushAsk /> : null}
        {load.kind === "loading" ? (
          <>
            <PlanCardSkeleton />
            <PlanCardSkeleton />
          </>
        ) : load.kind === "error" ? (
          <Text className="text-paragraph-md text-text-sub-600">{load.message}</Text>
        ) : load.upcoming.length === 0 && load.sortOut.length === 0 && load.past.length === 0 ? (
          <View className="gap-2 py-8">
            <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
              Nothing on. Suss.
            </Text>
            <Text className="text-paragraph-md text-text-sub-600">Start something and drop it in the group chat.</Text>
          </View>
        ) : (
          <>
            {load.upcoming.length > 0 ? <Section title="Up next" lead plans={load.upcoming} /> : null}
            {load.sortOut.length > 0 ? <Section title="To sort out" plans={load.sortOut} /> : null}
            {load.past.length > 0 ? <Section title="Been and done" plans={load.past} quiet /> : null}
          </>
        )}
      </ScrollView>
      <View className="gap-3 p-4">
        <Button.Root variant="dibs" size="large" block onPress={() => router.push("/new")}>
          <Button.Icon name="add-line" />
          Start a plan
        </Button.Root>
        <LinkButton.Root variant="gray" className="self-center" onPress={() => router.push("/open")}>
          Got a plan link? Open it
        </LinkButton.Root>
      </View>
    </SafeAreaView>
  );
}

/** "Up next" leads the screen (title-h3); later sections are small eyebrows, like the web's /home. */
function Section({ title, plans, lead, quiet }: { title: string; plans: MyPlan[]; lead?: boolean; quiet?: boolean }) {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className={lead ? "text-title-h3 text-text-strong-950" : "pt-2 text-subheading-sm uppercase text-text-soft-400"}>
        {title}
      </Text>
      {plans.map((p) => (
        <Pressable key={p.slug} accessibilityRole="button" accessibilityLabel={p.title} disabled={p.status === "cancelled"} onPress={() => router.push(`/p/${p.slug}`)}>
          <PlanCard
            plain
            quiet={quiet}
            title={p.title}
            status={p.status}
            statusLabel={p.status_label}
            meta={p.role_label ?? (p.host ? "Hosting" : "Going")}
            facts={facts(p)}
            footer={
              <View className="w-full gap-3">
                <View className="flex-row items-center justify-between">
                  {p.faces && p.faces.length ? (
                    <AvatarGroup.Root size="32">
                      {p.faces.slice(0, 5).map((f, i) => (
                        <Avatar.Root key={`${f.name}-${i}`} color={f.colour} name={f.name} />
                      ))}
                      {p.faces.length > 5 ? <AvatarGroup.Overflow>{`+${p.faces.length - 5}`}</AvatarGroup.Overflow> : null}
                    </AvatarGroup.Root>
                  ) : (
                    <View />
                  )}
                  <Text className="text-paragraph-sm text-text-sub-600">{p.going} in</Text>
                </View>
                {nudgeFor(p) ? (
                  <View className="flex-row items-center gap-2 border-t border-stroke-soft-200 pt-3">
                    <Icon name="arrow-right-line" className="text-[16px] leading-[16px] text-primary-dark" />
                    <Text className="flex-1 text-label-sm text-primary-dark">{nudgeFor(p)}</Text>
                  </View>
                ) : null}
              </View>
            }
          />
        </Pressable>
      ))}
    </View>
  );
}

/** The web's row facts: the day and time (only once there is one), then the place or the area. */
function facts(p: MyPlan): PlanFact[] {
  const out: PlanFact[] = [];
  const when = whenLong(p.starts_at);
  if (when) out.push({ icon: "calendar-line", text: when });
  const where = p.place ?? p.area;
  if (where) out.push({ icon: "map-pin-line", text: where });
  return out;
}

/** The server's nudge (money, wrap-up), or the one the app can work out on an older server. */
function nudgeFor(p: MyPlan): string | null {
  if (p.nudge !== undefined) return p.nudge;
  if (!p.host && !p.rsvp && p.status !== "cancelled" && p.status !== "wrapped") return "You haven't said if you're in";
  return null;
}
