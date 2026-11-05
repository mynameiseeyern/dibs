import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Redirect, router, Stack, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MyPlan } from "@dibs/shared/api";
import { PlanCard, PlanCardSkeleton, type PlanFact } from "@/components/dibby/plan-card";
import * as Button from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import * as LinkButton from "@/components/ui/link-button";
import { getMyPlans } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useColour } from "@/lib/theme";

/** Signed out: what the app is, and sign in. Signed in: your plans. */
export default function Home() {
  const { state } = useSession();
  const spinner = useColour("primary-base");
  if (state.status === "loading") return <ActivityIndicator className="flex-1" color={spinner} />;
  if (state.status === "signedOut") return <Welcome />;
  if (state.me && !state.me.name) return <Redirect href="/name" />;
  return <MyPlans />;
}

function Welcome() {
  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 justify-center gap-4 p-4">
        <Image source={require("../assets/icon.png")} className="h-24 w-24 rounded-3xl" accessibilityIgnoresInvertColors accessible={false} />
        <Text className="font-display text-[40px] leading-[44px] text-primary-base">dibby</Text>
        <Text className="text-title-h4 text-text-strong-950">Plans that actually happen.</Text>
        <Text className="text-paragraph-lg text-text-sub-600">Make a plan, drop it in the group chat, and the crew votes on where and when. Free, for everyone.</Text>
      </View>
      <View className="gap-3 p-4">
        <Button.Root size="large" block onPress={() => router.push("/sign-in")}>
          Sign in or sign up
        </Button.Root>
        <LinkButton.Root variant="gray" className="self-center" onPress={() => router.push("/open")}>
          Got a plan link? Open it
        </LinkButton.Root>
      </View>
    </SafeAreaView>
  );
}

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; upcoming: MyPlan[]; past: MyPlan[] };

function MyPlans() {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const { upcoming, past } = await getMyPlans();
      setLoad({ kind: "ok", upcoming, past });
    } catch (e) {
      setLoad((prev) => (prev.kind === "ok" ? prev : { kind: "error", message: (e as Error).message }));
    }
  }, []);

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
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Your account" hitSlop={12} onPress={() => router.push("/account")}>
              <Icon name="user-3-line" className="text-[24px] leading-[24px] text-text-strong-950" />
            </Pressable>
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
            <Text className="text-paragraph-md text-text-sub-600">When someone drops a plan link in the chat, open it here and it'll show up.</Text>
          </View>
        ) : (
          <>
            {load.upcoming.length > 0 ? <Section title="Coming up" plans={load.upcoming} /> : null}
            {load.past.length > 0 ? <Section title="Been and done" plans={load.past} /> : null}
          </>
        )}
      </ScrollView>
      <View className="p-4">
        <Button.Root size="large" mode="stroke" block onPress={() => router.push("/open")}>
          <Button.Icon name="link" />
          Open a plan link
        </Button.Root>
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
