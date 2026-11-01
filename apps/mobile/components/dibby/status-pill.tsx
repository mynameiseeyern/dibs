// The plan's status as a small pill. Inline here so the Dibby pieces don't depend on Badge.

import { Text, View } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { Icon, type IconName } from "@/components/ui/icon";

const pill = tv({
  slots: {
    root: "flex-row items-center gap-1 self-start rounded-full px-2 py-0.5",
    label: "text-label-xs",
    icon: "text-[14px] leading-[14px]",
  },
  variants: {
    tone: {
      warning: { root: "bg-warning-lighter", label: "text-warning-dark", icon: "text-warning-dark" },
      success: { root: "bg-success-lighter", label: "text-success-dark", icon: "text-success-dark" },
      primary: { root: "bg-primary-lighter", label: "text-primary-dark", icon: "text-primary-dark" },
      faded: { root: "bg-faded-lighter", label: "text-faded-dark", icon: "text-faded-dark" },
    },
  },
});

export function StatusPill({ tone, icon, children }: VariantProps<typeof pill> & { icon?: IconName; children: string }) {
  const s = pill({ tone });
  return (
    <View className={s.root()}>
      {icon ? <Icon name={icon} className={s.icon()} /> : null}
      <Text className={s.label()}>{children}</Text>
    </View>
  );
}
