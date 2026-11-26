// A plan's crew, at the top of the plan (ARV-93): "🥟 Dumpling Gang · Crew only"; members tap
// it to open the crew. Adding it to a crew, who can see it and taking it out live in the plan's
// ⋯ menu (plan-menu.tsx), with the sheets below.

import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PlanDetail } from "@dibs/shared/api";
import type { CrewSummary } from "@dibs/shared/crews";
import { Icon } from "@/components/ui/icon";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { Choice } from "@/components/dibby/flow";
import { getMyCrews, setVisibility } from "@/lib/crews";

export function CrewOnPlan({ detail }: { detail: PlanDetail }) {
  const { crew, visibility } = detail;
  if (!crew) return null;
  const who = visibility === "crew" ? "Crew only" : "Anyone with the link";
  return (
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
  );
}

/** Hosts: crew only, or anyone with the link (ARV-95). */
export function WhoCanSee({ slug, detail, apply, open, onOpenChange }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const { visibility } = detail;

  async function pick(v: "crew" | "link") {
    if (v === visibility || busy) return;
    setBusy(true);
    try {
      apply(await setVisibility(slug, v));
      toast.success(v === "crew" ? "Crew only now" : "Anyone with the link can join now");
      onOpenChange(false);
    } catch (e) {
      toast.error("Couldn't change that", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header title="Who can see this plan" />
        <Modal.Body>
          <View className="flex-row flex-wrap gap-2">
            <Choice label="Crew only" selected={visibility === "crew"} onPress={() => pick("crew")} />
            <Choice label="Anyone with the link" selected={visibility === "link"} onPress={() => pick("link")} />
          </View>
          <Text className="text-paragraph-sm text-text-sub-600">
            {visibility === "crew" ? "Only the crew can open the link. Switch to let mates outside the crew join." : "Anyone with the link can join, guests too. Switching back drops anyone not in the crew."}
          </Text>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}

/** Your crews, to put this plan in one. */
export function PickCrew({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (c: CrewSummary) => void }) {
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
