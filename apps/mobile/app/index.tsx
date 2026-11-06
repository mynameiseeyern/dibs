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
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerTitle: "",
          headerLeft: () => <Text className="font-display text-[28px] leading-[32px] text-primary-base">dibby</Text>,
          headerRight: () =>
            signedIn ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Your account" hitSlop={12} onPress={() => router.push("/account")}>
                <Icon name="user-3-line" className="text-[24px] leading-[24px] text-text-strong-950" />
              </Pressable>
            ) : (
              <LinkButton.Root variant="primary" onPress={() => router.push("/sign-in")}>
                Keep my plans
              </LinkButton.Root>
            ),
        }}
      />
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
            <Text className="text-title-h4 text-text-strong-950">No plans yet</Text>
            <Text className="text-paragraph-md text-text-sub-600">Make one, or open a link someone dropped in the chat.</Text>
          </View>
        ) : (
          <>
            {load.upcoming.length > 0 ? <Section title="Coming up" plans={load.upcoming} /> : null}
            {load.past.length > 0 ? <Section title="Been and done" plans={load.past} /> : null}
          </>
        )}
      </ScrollView>
      <View className="gap-3 p-4">
        <Button.Root size="large" block onPress={() => router.push("/new")}>
          <Button.Icon name="add-line" />
          Make a plan
        </Button.Root>
        <LinkButton.Root variant="gray" className="self-center" onPress={() => router.push("/open")}>
          Got a plan link? Open it
        </LinkButton.Root>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, plans }: { title: string; plans: MyPlan[] }) {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-label-md text-text-sub-600">
        {title}
      </Text>
      {plans.map((p) => (
        <Pressable key={p.slug} accessibilityRole="button" accessibilityLabel={p.title} disabled={p.status === "cancelled"} onPress={() => router.push(`/p/${p.slug}`)}>
          <PlanCard eyebrow={p.when} title={p.title} status={p.status} facts={facts(p)} footer={<Text className="text-label-sm text-text-sub-600">{answer(p)}</Text>} />
        </Pressable>
      ))}
    </View>
  );
}

function facts(p: MyPlan): PlanFact[] {
  const out: PlanFact[] = [];
  const where = p.voting ? "Place is up for a vote" : (p.place ?? p.area);
  if (where) out.push({ icon: "map-pin-line", text: where });
  out.push({ icon: "group-line", text: p.capacity ? `${p.going} of ${p.capacity} going` : `${p.going} going` });
  return out;
}

function answer(p: MyPlan): string {
  if (p.host) return "You're hosting";
  if (p.waitlisted) return "You're on the waitlist";
  if (p.rsvp === "in") return "You're in";
  if (p.rsvp === "maybe") return "You said maybe";
  if (p.rsvp === "out") return "You can't make it";
  return "You haven't replied";
}
