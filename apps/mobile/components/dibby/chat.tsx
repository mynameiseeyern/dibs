// The group chat, ported from `.db-chat` / `.db-msg` (docs/components/ChatBubble.md).
// Others on bg-soft-200 with their monogram and first name above a burst; yours on violet;
// Dibby on accent-lighter with its face and an AI tag; system lines centred and muted.

import type { ReactNode } from "react";
import { Image, Text, View, type ViewProps } from "react-native";
import type { MonogramColour } from "@dibs/shared/types";
import { tv } from "@/utils/tv";
import { Monogram } from "./monogram";

// Dibby's face: the raised lime friend from the logo (packages/ui/assets/logos).
const DIBBY_FACE = require("../../../../packages/ui/assets/logos/export/dibby-ai-member-256.png");

const bubble = tv({
  slots: {
    row: "max-w-[85%] flex-row items-end gap-2",
    body: "rounded-lg px-3.5 py-2.5",
    text: "text-paragraph-md text-text-strong-950",
    name: "mb-0.5 text-label-xs text-text-sub-600",
  },
  variants: {
    from: {
      them: { row: "self-start", body: "rounded-bl-[6px] bg-bg-soft-200" },
      me: { row: "flex-row-reverse self-end", body: "rounded-br-[6px] bg-primary-base", text: "text-static-white" },
      dibby: { row: "self-start", body: "rounded-bl-[6px] border-[1.5px] border-accent-light bg-accent-lighter" },
    },
  },
});

export function ChatThread({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={["gap-2", className].filter(Boolean).join(" ")} {...rest} />;
}

type MessageProps = {
  from: "me" | "them" | "dibby";
  children: ReactNode;
  /** Others: their first name, shown on the first message of a burst. */
  name?: string;
  colour?: MonogramColour;
  /** First message of a burst: shows the name (and, for others, the monogram). */
  first?: boolean;
};

export function ChatMessage({ from, children, name, colour = "violet", first = true }: MessageProps) {
  const s = bubble({ from });
  const label = from === "dibby" ? "Dibby" : from === "them" ? name : undefined;
  return (
    <View className={s.row()}>
      {from === "them" ? (
        first && name ? <Monogram name={name} colour={colour} /> : <View className="size-7" />
      ) : from === "dibby" ? (
        first ? <Image source={DIBBY_FACE} accessibilityIgnoresInvertColors className="size-7 rounded-full" /> : <View className="size-7" />
      ) : null}
      <View className="shrink">
        {first && label ? (
          <View className="flex-row items-center gap-1.5">
            <Text className={s.name()}>{label}</Text>
            {from === "dibby" ? (
              <View className="mb-0.5 rounded-full bg-accent-light px-1.5">
                <Text className="text-subheading-xs uppercase text-text-strong-950">AI</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View className={s.body()}>{typeof children === "string" ? <Text className={s.text()}>{children}</Text> : children}</View>
      </View>
    </View>
  );
}

/** "Mia set the place." Centred and muted. */
export function ChatSystem({ children }: { children: string }) {
  return <Text className="px-6 text-center text-paragraph-xs text-text-soft-400">{children}</Text>;
}

/** A timestamp between bursts: "Fri 6:42pm". */
export function ChatTime({ children }: { children: string }) {
  return <Text className="text-center text-paragraph-xs text-text-soft-400">{children}</Text>;
}
