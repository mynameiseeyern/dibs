// The Dibby card, ported from `.db-card` (packages/ui/src/components.css, docs/components/Card.md).
// <Card.Root variant="sticker"><Card.Title>…</Card.Title><Card.Text>…</Card.Text></Card.Root>

import { createContext, useContext } from "react";
import { Text, View, type TextProps, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { useShadow } from "@/lib/theme";

export const cardVariants = tv({
  slots: {
    root: "gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4",
    title: "text-title-h5 text-text-strong-950",
    text: "text-paragraph-md text-text-sub-600",
  },
  variants: {
    variant: {
      default: {},
      // The one card that matters right now: lavender sticker with the clay lift.
      sticker: { root: "border-[1.5px] border-stroke-sticker bg-bg-sticker" },
      // A softer lift for cards that sit on another surface.
      raised: { root: "border-transparent" },
      violet: { root: "border-transparent bg-primary-base", title: "text-static-white", text: "text-static-white" },
      ink: { root: "border-transparent bg-bg-strong-950", title: "text-text-white-0", text: "text-text-white-0" },
    },
  },
  defaultVariants: { variant: "default" },
});

type CardVariants = VariantProps<typeof cardVariants>;
const CardContext = createContext<CardVariants>({});

const SHADOW = { default: "sm", sticker: "clay", raised: "clay-sm", violet: "sm", ink: "sm" } as const;

function CardRoot({ variant = "default", className, style, ...rest }: ViewProps & CardVariants & { className?: string }) {
  const { root } = cardVariants({ variant });
  const shadow = useShadow(SHADOW[variant]);
  return (
    <CardContext.Provider value={{ variant }}>
      <View className={root({ class: className })} style={[shadow, style]} {...rest} />
    </CardContext.Provider>
  );
}

function CardTitle({ className, ...rest }: TextProps & { className?: string }) {
  const { title } = cardVariants(useContext(CardContext));
  return <Text accessibilityRole="header" className={title({ class: className })} {...rest} />;
}

function CardText({ className, ...rest }: TextProps & { className?: string }) {
  const { text } = cardVariants(useContext(CardContext));
  return <Text className={text({ class: className })} {...rest} />;
}

export { CardRoot as Root, CardTitle as Title, CardText as Text };
