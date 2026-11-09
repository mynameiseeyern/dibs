import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlanSummary } from "@dibs/shared/api";
import * as Button from "@/components/ui/button";
import { ReportPlan } from "@/components/dibby/report-plan";
import { getPlan } from "@/lib/api";
import { useColour } from "@/lib/theme";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error"; message: string } | { kind: "ok"; plan: PlanSummary };

/**
 * A plan, opened from its link. Same path as the web (/p/:slug), so a dibby.social link opens
 * here once universal links are set up. Read-only for now; joining hands over to the web page.
 */
export default function PlanScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const spinner = useColour("primary-base");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    getPlan(slug)
      .then((plan) => live && setState(plan ? { kind: "ok", plan } : { kind: "missing" }))
      .catch((e: Error) => live && setState({ kind: "error", message: e.message }));
    return () => {
      live = false;
    };
  }, [slug]);

  if (state.kind === "loading") return <ActivityIndicator className="flex-1" color={spinner} />;
  if (state.kind !== "ok")
    return (
      <View className="p-4">
        <Text className="text-paragraph-md text-text-sub-600">{state.kind === "missing" ? "Can't find that plan. It might have been called off." : state.message}</Text>
      </View>
    );

  const { plan } = state;
  const facts = [plan.when, plan.voting ? "Place is up for a vote" : (plan.place ?? plan.area)].filter(Boolean).join(" · ");
  const spots = plan.capacity ? `${plan.going} of ${plan.capacity} spots taken` : `${plan.going === 0 ? "Nobody's" : plan.going} in`;

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-4 p-4">
        <View className="gap-2 rounded-lg bg-bg-white-0 p-4">
          {plan.category ? <Text className="text-label-xs text-primary-base">{plan.category}</Text> : null}
          <Text className="text-title-h3 text-text-strong-950">{plan.title}</Text>
          {facts ? <Text className="text-paragraph-md text-text-strong-950">{facts}</Text> : null}
          <Text className="text-paragraph-md text-text-sub-600">{plan.status === "cancelled" ? "Called off." : spots}</Text>
          {plan.description ? <Text className="text-paragraph-md text-text-sub-600">{plan.description}</Text> : null}
        </View>
        <ReportPlan slug={plan.slug} />
      </ScrollView>
      <View className="p-4">
        <Button.Root size="large" block onPress={() => Linking.openURL(`https://dibby.social/p/${plan.slug}`)}>
          Reply on the web
        </Button.Root>
      </View>
    </SafeAreaView>
  );
}
