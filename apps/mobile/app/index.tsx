import { useCallback, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Redirect, router, Stack, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MyPlan } from "@dibs/shared/api";
import { DibbyHello, type Anchor } from "@/components/dibby/hello";
import { PushAsk } from "@/components/dibby/push-ask";
import { PlanCard, PlanCardSkeleton, type PlanFact } from "@/components/dibby/plan-card";
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
  const spinner = useColour("primary-base");
  if (state.status === "loading") return <ActivityIndicator className="flex-1" color={spinner} />;
  if (state.status === "signedIn" && state.me && !state.me.name) return <Redirect href="/name" />;
  if (state.status === "signedIn" || hasGuestPass) return <MyPlans signedIn={state.status === "signedIn"} />;
  return <Welcome />;
}

const MAKE = "Make plans";

/** The web's intro (app/new/PlanFlow.tsx): what it's for, and straight into making a plan. */
function Welcome() {
  const button = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const start = () => {
    // Dibby comes out from behind the button: measure where it is, then the hello moment plays.
    button.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 justify-center gap-4 p-4">
        <Text className="font-display text-[40px] leading-[44px] text-primary-base">dibby</Text>
        <Text accessibilityRole="header" className="font-display text-title-h2 text-text-strong-950">
          Get out of the group chat.
        </Text>
        <Text className="text-paragraph-lg text-text-sub-600">
          Everyone&rsquo;s keen till someone has to pick a day. Make the plan, drop the link in the chat, and the crew taps in. Free, no account needed.
        </Text>
      </View>
      <View className="gap-3 p-4">
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
      </View>
      <DibbyHello
        anchor={anchor}
        label={MAKE}
        squares={4}
        onDone={() => {
          router.push("/new");
          // Let the form mount under him before the overlay goes, so there's no gap.
          setTimeout(() => setAnchor(null), 80);
        }}
      />
    </SafeAreaView>
  );
}

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; upcoming: MyPlan[]; past: MyPlan[] };

function MyPlans({ signedIn }: { signedIn: boolean }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const { setGuestPass } = useSession();
  const fetchPlans = useCallback(async () => {
    try {
      const { upcoming, past, claimed } = await getMyPlans();
      setLoad({ kind: "ok", upcoming, past });
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
      <View className="h-14 flex-row items-center justify-between px-4">
        <Text accessibilityRole="header" className="font-display text-[28px] leading-[32px] text-primary-base">
          dibby
        </Text>
        {signedIn ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Your account" hitSlop={12} onPress={() => router.push("/account")}>
            <Icon name="user-3-line" className="text-[24px] leading-[24px] text-text-strong-950" />
          </Pressable>
        ) : (
          <LinkButton.Root variant="primary" onPress={() => router.push("/sign-in")}>
            Keep my plans
          </LinkButton.Root>
        )}
      </View>
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
        {load.kind === "ok" && load.upcoming.length > 0 ? <PushAsk /> : null}
        {load.kind === "loading" ? (
          <>
            <PlanCardSkeleton />
            <PlanCardSkeleton />
          </>
        ) : load.kind === "error" ? (
          <Text className="text-paragraph-md text-text-sub-600">{load.message}</Text>
        ) : load.upcoming.length === 0 && load.past.length === 0 ? (
          <View className="gap-2 py-8">
            <Text accessibilityRole="header" className="font-display text-title-h3 text-text-strong-950">
              Nothing on. Suss.
            </Text>
            <Text className="text-paragraph-md text-text-sub-600">Start something and drop it in the group chat.</Text>
          </View>
        ) : (
          <>
            {load.upcoming.length > 0 ? <Section title="Up next" lead plans={load.upcoming} /> : null}
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
      <Text accessibilityRole="header" className={lead ? "font-display text-title-h3 text-text-strong-950" : "pt-2 text-subheading-sm uppercase text-text-soft-400"}>
        {title}
      </Text>
      {plans.map((p) => {
        const nudge = nudgeFor(p);
        return (
          <Pressable key={p.slug} accessibilityRole="button" accessibilityLabel={p.title} disabled={p.status === "cancelled"} onPress={() => router.push(`/p/${p.slug}`)} className={quiet ? "opacity-80" : undefined}>
            <PlanCard
              title={p.title}
              status={p.status}
              category={p.category}
              meta={p.host ? "Hosting" : p.rsvp === "in" ? (p.waitlisted ? "Waitlist" : "Going") : p.rsvp === "maybe" ? "Maybe" : null}
              facts={facts(p)}
              footer={
                <View className="w-full gap-2">
                  <Text className="text-paragraph-sm text-text-sub-600">{p.going} in</Text>
                  {nudge ? (
                    <View className="flex-row items-center gap-1.5">
                      <Icon name="arrow-right-line" className="text-[16px] leading-[16px] text-primary-base" />
                      <Text className="text-label-sm text-primary-base">{nudge}</Text>
                    </View>
                  ) : null}
                </View>
              }
            />
          </Pressable>
        );
      })}
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

/** The one thing to do next on this plan, if there is one (the money and wrap-up nudges need bills). */
function nudgeFor(p: MyPlan): string | null {
  if (!p.host && !p.rsvp && p.status !== "cancelled" && p.status !== "wrapped") return "You haven't said if you're in";
  return null;
}
