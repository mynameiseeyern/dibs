import { useFonts } from "expo-font";
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";

/** Every face the type styles name (packages/ui/native/theme.cjs), plus the Remix Icon font. */
export function useDibbyFonts() {
  return useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    "DMMono-Regular": require("@dibs/ui/fonts/DMMono-Regular.ttf"),
    "DMMono-Medium": require("@dibs/ui/fonts/DMMono-Medium.ttf"),
    remixicon: require("remixicon/fonts/remixicon.ttf"),
  });
}
