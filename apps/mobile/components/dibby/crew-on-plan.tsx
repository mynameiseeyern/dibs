// A plan's crew, at the top of the plan. With a crew (ARV-93): "🥟 Dumpling Gang · Crew only";
// members tap it to open the crew, and hosts switch who can see it or take it out of the crew
// (ARV-95). Without one, hosts can add it to one of their crews.

import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PlanDetail } from "@dibs/shared/api";
import type { CrewSummary } from "@dibs/shared/crews";
import { Icon } from "@/components/ui/icon";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { Choice } from "@/components/dibby/flow";
import { getMyCrews, movePlanToCrew, setVisibility } from "@/lib/crews";
import { useSession } from "@/lib/session";

export function CrewOnPlan({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const { state } = useSession();
  const { crew, visibility } = detail;
  const host = Boolean(detail.me?.host);
  const signedIn = state.status === "signedIn";

  // No crew: hosts with an account can add it to one.
  if (!crew) {
    if (!host || !signedIn || detail.plan.status === "wrapped" || detail.plan.status === "cancelled") return null;
    return (
      <>
        <LinkButton.Root variant="primary" className="self-start" onPress={() => setPicking(true)}>
          <LinkButton.Icon name="group-line" />
          Add to a crew
        </LinkButton.Root>
        <PickCrew
          open={picking}
          onOpenChange={setPicking}
          onPick={async (c) => {
            setPicking(false);
            try {
              const { detail: next, moved } = await movePlanToCrew(slug, c.id);
              apply(next);
              toast.success(
                `Added to ${c.emoji} ${c.name}`,
                moved.visibility === "link" ? { description: "Some people on it aren't in the crew, so anyone with the link can still get in. Switch to crew only if you want." } : { description: "Crew only now." }
              );
            } catch (e) {
              toast.error("Couldn't add it", { description: (e as Error).message });
            }
          }}
        />
      </>
    );
  }

  const who = visibility === "crew" ? "Crew only" : "Anyone with the link";

  async function pick(v: "crew" | "link") {
    if (v === visibility || busy) return;
    setBusy(true);
    try {
      apply(await setVisibility(slug, v));
      toast.success(v === "crew" ? "Crew only now" : "Anyone with the link can join now");
    } catch (e) {
      toast.error("Couldn't change that", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function takeOut() {
    Alert.alert(`Take it out of ${crew!.name}?`, "It goes back to an ordinary plan: anyone with the link can get in, and it's off the crew's page.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Take it out",
        onPress: async () => {
          try {
            apply((await movePlanToCrew(slug, null)).detail);
            toast.success("Taken out of the crew");
          } catch (e) {
            toast.error("Couldn't take it out", { description: (e as Error).message });
          }
        },
      },
    ]);
  }

  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole={crew.member ? "button" : "text"}
        accessibilityLabel={`${crew.name}, ${who}`}
        disabled={!crew.member}
        onPress={() => router.push(`/crews/${crew.id}`)}
        className="flex-row items-center gap-2 self-start rounded-full bg-primary-lighter px-3 py-2 active:opacity-80"
      >
        <Text className="text-[16px] leading-[20px]">{crew.emoji}</Text>
        <Text numberOfLines={1} className="max-w-[220px] text-label-sm text-primary-dark">
          {crew.name}
        </Text>
        <Text className="text-label-sm text-primary-dark">· {who}</Text>
        {crew.member ? <Icon name="arrow-right-s-line" className="text-[16px] leading-[18px] text-primary-dark" /> : null}
      </Pressable>
      {host && visibility ? (
        <View className="gap-2">
          <Text className="text-label-sm text-text-sub-600">Who can see this plan</Text>
          <View className="flex-row flex-wrap gap-2">
            <Choice label="Crew only" selected={visibility === "crew"} onPress={() => pick("crew")} />
            <Choice label="Anyone with the link" selected={visibility === "link"} onPress={() => pick("link")} />
          </View>
          <Text className="text-paragraph-xs text-text-soft-400">
            {visibility === "crew" ? "Only the crew can open the link. Switch to let mates outside the crew join." : "Anyone with the link can join, guests too. Switching back drops anyone not in the crew."}
          </Text>
          {crew.member ? (
            <LinkButton.Root variant="gray" className="self-start" onPress={takeOut}>
              Take it out of the crew
            </LinkButton.Root>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Your crews, to put this plan in one. */
function PickCrew({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (c: CrewSummary) => void }) {
  const [crews, setCrews] = useState<CrewSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setError(null);
    getMyCrews()
      .then((r) => live && setCrews(r.crews))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [open]);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header title="Add to a crew" description="It shows up on the crew's page, and the crew hears about it." />
        <Modal.Body>
          {error ? (
            <Text className="text-paragraph-md text-text-sub-600">{error}</Text>
          ) : crews === null ? null : crews.length === 0 ? (
            <View className="gap-2">
              <Text className="text-paragraph-md text-text-sub-600">You're not in any crews yet.</Text>
              <LinkButton.Root
                variant="primary"
                className="self-start"
                onPress={() => {
                  onOpenChange(false);
                  router.push("/crews/new");
                }}
              >
                Make a crew
              </LinkButton.Root>
            </View>
          ) : (
            <View className="gap-2">
              {crews.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Add to ${c.name}`}
                  onPress={() => onPick(c)}
                  className="min-h-12 flex-row items-center gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 active:opacity-80"
                >
                  <Text className="text-[22px] leading-[28px]">{c.emoji}</Text>
                  <Text numberOfLines={1} className="flex-1 text-label-md text-text-strong-950">
                    {c.name}
                  </Text>
                  <Text className="text-paragraph-sm text-text-sub-600">
                    {c.members} {c.members === 1 ? "person" : "people"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
