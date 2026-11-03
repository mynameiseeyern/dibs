import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import theme from "@dibs/ui/native/theme.cjs";

export { type ClassValue } from "clsx";

// The Dibby type styles, shadows and radii, so tailwind-merge knows text-label-sm is a font size
// (not a colour) and so on. Same as apps/web/utils/cn.ts, with the names read from the theme.
export const twMergeConfig = {
  extend: {
    classGroups: {
      "font-size": [{ text: theme.typeNames as string[] }],
      rounded: [{ rounded: Object.keys(theme.borderRadius) }],
    },
  },
};

const customTwMerge = extendTailwindMerge(twMergeConfig);

/** `clsx` plus `tailwind-merge`, for when classes might clash. */
export function cn(...classes: ClassValue[]) {
  return customTwMerge(clsx(...classes));
}
