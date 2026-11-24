// The web's Wordmark and SiteFooter (apps/web/components/Logo.tsx, SiteFooter.tsx): the logo on
// home, sign-in and account, and the legal links on the pages people land on.

import { Image, Linking, Pressable, Text, View } from "react-native";
import { API_URL } from "@/lib/api";

/** Dibby waving and the lowercase **dibby**, 32px, like `.wordmark` on the web. */
export function Wordmark() {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Dibby" className="min-h-11 flex-row items-center gap-2">
      <Image source={require("../../assets/dibby/icon-192.png")} style={{ width: 32, height: 32, borderRadius: 8 }} accessible={false} />
      <Text className="font-display text-[28px] leading-[32px] tracking-[-1px] text-text-strong-950">dibby</Text>
    </View>
  );
}

const LINKS = [
  ["Privacy", `${API_URL}/privacy`],
  ["Terms", `${API_URL}/terms`],
  ["Contact", "mailto:hello@dibby.social"],
] as const;

/** Privacy, Terms, Contact, and the money line. */
export function SiteFooter() {
  return (
    <View className="items-center gap-1 pb-4 pt-6">
      <View className="flex-row gap-2">
        {LINKS.map(([label, url]) => (
          <Pressable key={label} accessibilityRole="link" onPress={() => Linking.openURL(url)} className="min-h-11 justify-center px-3 active:opacity-60">
            <Text className="text-paragraph-sm text-text-sub-600 underline">{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text className="text-paragraph-xs text-text-sub-600">Dibby never holds or moves your money.</Text>
    </View>
  );
}
