import type { ComponentRef } from "react";
// "Turn this into a crew?" (ARV-96), on a plan's page for its host: the same people keep turning
// up, so make them a crew. Name + emoji, then each of them gets a personal invite that lets them
// straight in, and this plan becomes the crew's first.

import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useFocusOnOpen } from "@/lib/use-focus-on-open";
import { Image } from "expo-image";
import { cleanCrew, CREW_EMOJI } from "@dibs/shared/crews";
import type { PlanDetail } from "@dibs/shared/api";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { DIBBY } from "@/components/dibby/flow";
import { CrewEmojiPicker } from "@/components/dibby/crew-emoji-picker";
import { makeCrewFromPlan } from "@/lib/crews";
import { dismiss, isDismissed } from "@/lib/crew-prompt";

/** "Mia", "Mia and Sam", "Mia, Sam and Jo", "Mia, Sam and 3 others". */
function names(people: { name: string }[]): string {
  const first = people.map((p) => p.name.split(" ")[0]);
  if (first.length <= 2) return first.join(" and ");
  if (first.length === 3) return `${first[0]}, ${first[1]} and ${first[2]}`;
  return `${first[0]}, ${first[1]} and ${first.length - 2} others`;
}

export function CrewPrompt({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const s = detail.crew_suggestion;
  const [hidden, setHidden] = useState(true);
  const [making, setMaking] = useState(false);

  useEffect(() => {
    let live = true;
    if (s) isDismissed(s.key).then((d) => live && setHidden(d));
    return () => {
      live = false;
    };
  }, [s?.key]);

  if (!s || hidden) return null;
  const who = names(s.people);

  return (
    <View className="gap-3 rounded-lg bg-primary-lighter p-4">
      <View className="flex-row items-center gap-3">
        <Image source={DIBBY.thumbs} style={{ width: 52, height: 52 }} contentFit="contain" accessible={false} />
        <View className="flex-1 gap-0.5">
          <Text accessibilityRole="header" className="text-label-md text-text-strong-950">
            Same crew again?
          </Text>
          <Text className="text-paragraph-sm text-text-sub-600">{who} have been on your plans before. Make them a crew and every plan&apos;s in one spot.</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <Button.Root size="small" onPress={() => setMaking(true)}>
          Make a crew
        </Button.Root>
        <LinkButton.Root
          variant="gray"
          onPress={() => {
            setHidden(true);
            dismiss(s.key);
          }}
        >
          Not now
        </LinkButton.Root>
      </View>
      <MakeSheet
        open={making}
        onOpenChange={setMaking}
        who={who}
        onMake={async (name, emoji) => {
          try {
            const { crew, invited, detail: next } = await makeCrewFromPlan(slug, name, emoji);
            setMaking(false);
            apply(next);
            toast.success(`${crew.emoji} ${crew.name} is ready`, { description: invited > 0 ? `${who} got an invite. They're in as soon as they tap it.` : "Invite people from the crew's page." });
          } catch (e) {
            toast.error("Couldn't make the crew", { description: (e as Error).message });
          }
        }}
      />
    </View>
  );
}

function MakeSheet({ open, onOpenChange, who, onMake }: { open: boolean; onOpenChange: (o: boolean) => void; who: string; onMake: (name: string, emoji: string) => Promise<void> }) {
  const nameBox = useFocusOnOpen<ComponentRef<typeof TextInput>>(open);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(CREW_EMOJI[0]);
  const [busy, setBusy] = useState(false);
  const clean = cleanCrew(name, emoji);
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header title="Name your crew" description={`${who} get a link that lets them straight in. This plan's the crew's first.`} />
        <Modal.Body>
          <View className="gap-4">
            <View className="gap-1">
              <Label.Root>Crew name</Label.Root>
              <Input.Root size="large">
                <Input.Wrapper>
                  <Input.Input ref={nameBox} value={name} onChangeText={setName} placeholder="Dumpling Gang" maxLength={40} />
                </Input.Wrapper>
              </Input.Root>
            </View>
            <CrewEmojiPicker emoji={emoji} onChange={setEmoji} />
          </View>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            size="large"
            block
            disabled={!clean || busy}
            onPress={async () => {
              if (!clean) return;
              setBusy(true);
              await onMake(clean.name, clean.emoji);
              setBusy(false);
            }}
          >
            {busy ? "Making it…" : "Make the crew"}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
