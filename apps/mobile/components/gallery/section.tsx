import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-subheading-xs uppercase text-text-soft-400">{title}</Text>
      {children}
    </View>
  );
}
