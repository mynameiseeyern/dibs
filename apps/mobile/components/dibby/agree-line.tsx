import { Linking, Text } from "react-native";
import { API_URL } from "@/lib/api";

/** Shown before anyone can post anything (Apple 1.2, Google's UGC policy). */
export function AgreeLine() {
  const link = (path: string, label: string) => (
    <Text accessibilityRole="link" className="text-paragraph-xs text-primary-dark underline" onPress={() => Linking.openURL(`${API_URL}${path}`)}>
      {label}
    </Text>
  );
  return (
    <Text className="text-paragraph-xs text-text-soft-400">
      By carrying on, you&rsquo;re saying you&rsquo;re 16 or older and you agree to the {link("/terms", "Terms")} and {link("/privacy", "Privacy")}. No bullying, hate or dodgy content.
    </Text>
  );
}
