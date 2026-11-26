// Pick a crew's emoji: one of a few, or any emoji typed in. Used making a crew and in its settings.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CREW_EMOJI, isSingleEmoji } from "@dibs/shared/crews";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";

export function CrewEmojiPicker({ emoji, onChange }: { emoji: string; onChange: (e: string) => void }) {
  const [own, setOwn] = useState("");
  return (
    <View className="gap-3">
      <Label.Root>Pick an emoji</Label.Root>
      <View className="flex-row flex-wrap gap-2">
        {CREW_EMOJI.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="radio"
            accessibilityState={{ selected: e === emoji }}
            accessibilityLabel={e}
            onPress={() => {
              onChange(e);
              setOwn("");
            }}
            className={`size-12 items-center justify-center rounded-lg border active:opacity-70 ${e === emoji ? "border-primary-base bg-primary-lighter" : "border-stroke-soft-200 bg-bg-white-0"}`}
          >
            <Text className="text-[24px] leading-[30px]">{e}</Text>
          </Pressable>
        ))}
      </View>
      <View className="gap-1">
        <Label.Root>Or use your own</Label.Root>
        <Input.Root>
          <Input.Wrapper>
            <Input.Input
              value={own}
              placeholder="Tap the emoji key"
              maxLength={16}
              onChangeText={(t) => {
                setOwn(t);
                const v = t.trim();
                if (isSingleEmoji(v)) onChange(v);
              }}
            />
          </Input.Wrapper>
        </Input.Root>
      </View>
    </View>
  );
}
