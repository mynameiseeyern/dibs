import clsx, { type ClassValue } from "clsx";
export { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The Dibs type styles, shadows and radii from packages/ui/src/tailwind-theme.css, so
// tailwind-merge knows text-label-sm is a font size (not a colour) and so on.
const texts = [
  "title-display", "title-h1", "title-h2", "title-h3", "title-h4", "title-h5", "title-h6",
  "label-lg", "label-md", "label-sm", "label-xs",
  "paragraph-lg", "paragraph-md", "paragraph-sm", "paragraph-xs",
  "subheading-sm", "subheading-xs", "number-lg", "number-md", "code",
];
const shadows = [
  "xs", "sm", "md", "pop", "regular-xs", "regular-sm", "regular-md", "tooltip", "toggle-switch", "switch-thumb",
  "custom-xs", "custom-sm", "custom-md", "custom-lg", "button-primary-focus", "button-important-focus", "button-error-focus",
];
const radii = ["xs", "sm", "md", "lg", "xl", "icon", "full", "10", "20"];

export const twMergeConfig = {
  extend: {
    classGroups: {
      "font-size": [{ text: texts }],
      shadow: [{ shadow: shadows }],
      rounded: [{ rounded: radii }],
    },
  },
};

const customTwMerge = extendTailwindMerge(twMergeConfig);

/** `clsx` plus `tailwind-merge`, for when classes might clash. */
export function cn(...classes: ClassValue[]) {
  return customTwMerge(clsx(...classes));
}
