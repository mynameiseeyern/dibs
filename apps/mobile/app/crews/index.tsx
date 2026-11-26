import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CrewRole, CrewSummary } from "@dibs/shared/crews";
import * as Button from "@/components/ui/button";
import { TopBar } from "@/components/dibby/top-bar";
import { NeedsAccount } from "@/components/dibby/crews-strip";
import { getMyCrews } from "@/lib/crews";
import { useSession } from "@/lib/session";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; crews: CrewSummary[] };

const ROLE: Record<CrewRole, string | null> = { owner: "You run it", admin: "Admin", member: null };

/** Your crews (ARV-90). Each crew's own page, with its plans, comes in ARV-92. */
export default function Crews() {
  const { state } = useSession();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const signedIn = state.status === "signedIn";

  const fetchCrews = useCallback(async () => {
    if (!signedIn) return;
    try {
      setLoad({ kind: "ok", crews: (await getMyCrews()).crews });
    } catch (e) {
      setLoad((prev) => (prev.kind === "ok" ? prev : { kind: "error", message: (e as Error).message }));
    }
  }, [signedIn]);
  useFocusEffect(
    useCallback(() => {
      fetchCrews();
    }, [fetchCrews])
  );

  if (!signedIn) return <NeedsAccount />;

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar title="Crews" />
      <ScrollView
        contentContainerClassName="gap-3 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchCrews();
              setRefreshing(false);
            }}
          />
        }
      >
        {load.kind === "loading" ? null : load.kind === "error" ? (
          <Text className="text-paragraph-md text-text-sub-600">{load.message}</Text>
        ) : load.crews.length === 0 ? (
          <View className="gap-2 py-8">
            <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
              No crews yet
            </Text>
            <Text className="text-paragraph-md text-text-sub-600">Make one for the people you keep hanging out with. Every plan, one list.</Text>
          </View>
        ) : (
          load.crews.map((c) => {
            const facts = [`${c.members} ${c.members === 1 ? "person" : "people"}`, ROLE[c.role]].filter(Boolean).join(" · ");
            return (
              <View key={c.id} accessible accessibilityLabel={`${c.name}, ${facts}`} className="flex-row items-center gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3">
                <View className="size-12 items-center justify-center rounded-lg bg-primary-lighter">
                  <Text className="text-[26px] leading-[32px]">{c.emoji}</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text numberOfLines={1} className="text-label-md text-text-strong-950">
                    {c.name}
                  </Text>
                  <Text className="text-paragraph-sm text-text-sub-600">{facts}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <View className="p-4">
        <Button.Root size="large" block onPress={() => router.push("/crews/new")}>
          <Button.Icon name="add-line" />
          Make a crew
        </Button.Root>
      </View>
    </SafeAreaView>
  );
}
