import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlanSummary } from "@dibs/shared/api";
import { Button } from "@/components/Button";
import { getPlan } from "@/lib/api";
import { font, radius, space, useTheme } from "@/lib/theme";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error"; message: string } | { kind: "ok"; plan: PlanSummary };

/**
 * A plan, opened from its link. Same path as the web (/p/:slug), so a dibby.social link opens
 * here once universal links are set up. Read-only for now; joining hands over to the web page.
 */
export default function PlanScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colour } = useTheme();
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

  const body = (text: string, tone: "strong" | "sub" = "sub") => (
    <Text style={{ fontFamily: font.sans, fontSize: 17, color: colour[tone === "strong" ? "text-strong-950" : "text-sub-600"] }}>{text}</Text>
  );

  if (state.kind === "loading") return <ActivityIndicator style={{ flex: 1 }} color={colour["primary-base"]} />;
  if (state.kind !== "ok")
    return <View style={{ padding: space["space-4"] }}>{body(state.kind === "missing" ? "Can't find that plan. It might have been called off." : state.message)}</View>;

  const { plan } = state;
  const facts = [plan.when, plan.voting ? "Place is up for a vote" : (plan.place ?? plan.area)].filter(Boolean).join(" · ");
  const spots = plan.capacity ? `${plan.going} of ${plan.capacity} spots taken` : `${plan.going === 0 ? "Nobody's" : plan.going} in`;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: space["space-4"], gap: space["space-4"] }}>
        <View style={{ backgroundColor: colour["bg-white-0"], borderRadius: radius["radius-lg"], padding: space["space-4"], gap: space["space-2"] }}>
          {plan.category ? <Text style={{ fontFamily: font.sansMedium, fontSize: 13, color: colour["primary-base"] }}>{plan.category}</Text> : null}
          <Text style={{ fontFamily: font.display, fontSize: 32, lineHeight: 36, color: colour["text-strong-950"] }}>{plan.title}</Text>
          {facts ? body(facts, "strong") : null}
          {body(plan.status === "cancelled" ? "Called off." : spots)}
          {plan.description ? body(plan.description) : null}
        </View>
      </ScrollView>
      <View style={{ padding: space["space-4"] }}>
        <Button label="Reply on the web" onPress={() => Linking.openURL(`https://dibby.social/p/${plan.slug}`)} />
      </View>
    </SafeAreaView>
  );
}
