// AlignUI Avatar, ported to React Native and themed for Dibby: a circle with a photo, or initials on one
// of the crew colours. <Avatar.Root color="mint" name="Priya Shah" />, <Avatar.Root><Avatar.Image source={{ uri }} /></Avatar.Root>

import { createContext, useContext, type ReactNode } from "react";
import { Image, View, type ImageProps, type ViewProps } from "react-native";
import { monogram } from "@dibs/shared/plans";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { Icon as BaseIcon } from "./icon";

export const avatarVariants = tv({
  slots: {
    root: "items-center justify-center overflow-hidden rounded-full",
    label: "text-center font-sans-bold uppercase",
    image: "size-full rounded-full",
    placeholder: "",
    indicator: "absolute -right-0.5",
  },
  variants: {
    size: {
      "80": { root: "size-20", label: "text-[32px] leading-[36px]", placeholder: "text-[44px] leading-[44px]" },
      "72": { root: "size-[72px]", label: "text-[29px] leading-[32px]", placeholder: "text-[40px] leading-[40px]" },
      "64": { root: "size-16", label: "text-[26px] leading-[30px]", placeholder: "text-[36px] leading-[36px]" },
      "56": { root: "size-14", label: "text-[22px] leading-[26px]", placeholder: "text-[32px] leading-[32px]" },
      "48": { root: "size-12", label: "text-[19px] leading-[22px]", placeholder: "text-[28px] leading-[28px]" },
      "40": { root: "size-10", label: "text-[16px] leading-[19px]", placeholder: "text-[24px] leading-[24px]" },
      "32": { root: "size-8", label: "text-[13px] leading-[16px]", placeholder: "text-[20px] leading-[20px]" },
      "24": { root: "size-6", label: "text-[10px] leading-[12px]", placeholder: "text-[14px] leading-[14px]" },
      "20": { root: "size-5", label: "text-[8px] leading-[10px]", placeholder: "text-[12px] leading-[12px]" },
    },
    // The Dibby crew colours (MonogramColour); gray is for the "+3" overflow.
    color: {
      violet: { root: "bg-primary-light", label: "text-primary-darker", placeholder: "text-primary-darker" },
      lime: { root: "bg-accent-base", label: "text-static-black", placeholder: "text-static-black" },
      sun: { root: "bg-away-light", label: "text-away-dark", placeholder: "text-away-dark" },
      mint: { root: "bg-success-light", label: "text-success-dark", placeholder: "text-success-dark" },
      tangerine: { root: "bg-highlighted-light", label: "text-highlighted-dark", placeholder: "text-highlighted-dark" },
      sky: { root: "bg-information-light", label: "text-information-dark", placeholder: "text-information-dark" },
      coral: { root: "bg-error-light", label: "text-error-dark", placeholder: "text-error-dark" },
      rose: { root: "bg-feature-light", label: "text-feature-dark", placeholder: "text-feature-dark" },
      aqua: { root: "bg-verified-light", label: "text-verified-dark", placeholder: "text-verified-dark" },
      ivory: { root: "bg-stable-light", label: "text-stable-dark", placeholder: "text-stable-dark" },
      gray: { root: "bg-bg-soft-200", label: "text-text-sub-600", placeholder: "text-text-soft-400" },
    },
    // Inside an AvatarGroup: a ring in the page colour so overlapping faces stay separate.
    ringed: { true: { root: "border-2 border-stroke-white-0" } },
  },
  defaultVariants: { size: "40", color: "violet" },
});

export const avatarStatusVariants = tv({
  base: "size-3 rounded-full border-2 border-stroke-white-0",
  variants: {
    status: { online: "bg-success-base", offline: "bg-faded-base", busy: "bg-error-base", away: "bg-away-base" },
  },
  defaultVariants: { status: "online" },
});

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>["size"]>;
type AvatarVariants = VariantProps<typeof avatarVariants>;

/** Set by AvatarGroup.Root so each face takes the group's size and ring. */
export const AvatarGroupContext = createContext<{ size?: AvatarSize } | null>(null);
const AvatarContext = createContext<AvatarVariants>({});

export type AvatarRootProps = ViewProps &
  Omit<AvatarVariants, "ringed"> & {
    className?: string;
    /** Initials are made from this ("Priya Shah" → PS) when there are no children. */
    name?: string;
    children?: ReactNode;
  };

function AvatarRoot({ size, color, name, className, children, ...rest }: AvatarRootProps) {
  const group = useContext(AvatarGroupContext);
  const shared = { size: size ?? group?.size, color, ringed: !!group };
  const { root, label, placeholder } = avatarVariants(shared);
  const content = children ?? (name ? monogram(name) : null);
  return (
    <AvatarContext.Provider value={shared}>
      <View accessibilityLabel={name} className={root({ class: className })} {...rest}>
        {content == null ? <BaseIcon name="user-3-fill" className={placeholder()} /> : wrapText(content, label())}
      </View>
    </AvatarContext.Provider>
  );
}

function AvatarImage({ className, ...rest }: ImageProps & { className?: string }) {
  const { image } = avatarVariants(useContext(AvatarContext));
  // Size as a style: an image with no width and height draws at its natural size on some platforms.
  return <Image accessibilityIgnoresInvertColors className={image({ class: className })} {...rest} style={[{ width: "100%", height: "100%" }, rest.style]} />;
}

/** A small badge on the edge of the circle: an <Avatar.Status /> or <Avatar.Notification />. */
function AvatarIndicator({ position = "bottom", className, ...rest }: ViewProps & { className?: string; position?: "top" | "bottom" }) {
  const { indicator } = avatarVariants(useContext(AvatarContext));
  return <View className={indicator({ class: [position === "top" ? "top-0" : "bottom-0", className] })} {...rest} />;
}

function AvatarStatus({ status, className, ...rest }: ViewProps & VariantProps<typeof avatarStatusVariants> & { className?: string }) {
  return <View className={avatarStatusVariants({ status, class: className })} {...rest} />;
}

function AvatarNotification({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={avatarStatusVariants({ class: ["bg-error-base", className] })} {...rest} />;
}

export { AvatarRoot as Root, AvatarImage as Image, AvatarIndicator as Indicator, AvatarStatus as Status, AvatarNotification as Notification };
