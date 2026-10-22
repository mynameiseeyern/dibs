// AlignUI Badge v0.0.0

import * as React from 'react';
import { tv, type VariantProps } from '@/utils/tv';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { Slot } from '@radix-ui/react-slot';

const BADGE_ROOT_NAME = 'BadgeRoot';
const BADGE_ICON_NAME = 'BadgeIcon';
const BADGE_DOT_NAME = 'BadgeDot';

// AlignUI's Badge API, with the Dibs status families as colours. Pills, Figtree 600 12px,
// 24px tall; the default (lighter) is a soft fill with -dark text, as in the Dibs Badge.
// Status always comes with a word or an icon, never colour alone.
const BADGE_COLORS = {
  primary: {},
  accent: {},
  information: {},
  warning: {},
  error: {},
  success: {},
  away: {},
  feature: {},
  verified: {},
  highlighted: {},
  stable: {},
  faded: {},
} as const;

export const badgeVariants = tv({
  slots: {
    root: 'inline-flex items-center justify-center whitespace-nowrap rounded-full font-sans leading-none',
    icon: 'shrink-0 text-[14px] leading-none',
    dot: ['dot', 'flex items-center justify-center', 'before:size-1.5 before:rounded-full before:bg-current'],
  },
  variants: {
    size: {
      small: {
        root: 'h-5 gap-1 px-1.5 text-label-xs',
        icon: 'size-3.5',
        dot: 'size-3',
      },
      medium: {
        root: 'h-6 gap-1 px-2.5 text-label-xs',
        icon: 'size-3.5',
        dot: '-mx-0.5 size-3',
      },
    },
    variant: {
      filled: {},
      light: {},
      lighter: {},
      stroke: { root: 'bg-bg-white-0 ring-1 ring-inset ring-current' },
    },
    color: BADGE_COLORS,
    disabled: {
      true: { root: 'pointer-events-none bg-bg-soft-200 text-text-disabled-300 ring-0' },
    },
    square: {
      true: {},
    },
  },
  compoundVariants: [
    { variant: 'filled', color: 'primary', class: { root: 'bg-primary-base text-static-white' } },
    { variant: 'light', color: 'primary', class: { root: 'bg-primary-light text-primary-dark' } },
    { variant: 'lighter', color: 'primary', class: { root: 'bg-primary-lighter text-primary-dark' } },
    { variant: 'stroke', color: 'primary', class: { root: 'text-primary-dark' } },
    { variant: 'filled', color: 'accent', class: { root: 'bg-accent-base text-static-black' } },
    { variant: 'light', color: 'accent', class: { root: 'bg-accent-light text-accent-dark' } },
    { variant: 'lighter', color: 'accent', class: { root: 'bg-accent-base text-static-black' } },
    { variant: 'stroke', color: 'accent', class: { root: 'text-accent-dark' } },
    { variant: 'filled', color: 'information', class: { root: 'bg-information-base text-static-black' } },
    { variant: 'light', color: 'information', class: { root: 'bg-information-light text-information-dark' } },
    { variant: 'lighter', color: 'information', class: { root: 'bg-information-lighter text-information-dark' } },
    { variant: 'stroke', color: 'information', class: { root: 'text-information-dark' } },
    { variant: 'filled', color: 'warning', class: { root: 'bg-warning-base text-static-black' } },
    { variant: 'light', color: 'warning', class: { root: 'bg-warning-light text-warning-dark' } },
    { variant: 'lighter', color: 'warning', class: { root: 'bg-warning-lighter text-warning-dark' } },
    { variant: 'stroke', color: 'warning', class: { root: 'text-warning-dark' } },
    { variant: 'filled', color: 'error', class: { root: 'bg-error-base text-static-black' } },
    { variant: 'light', color: 'error', class: { root: 'bg-error-light text-error-dark' } },
    { variant: 'lighter', color: 'error', class: { root: 'bg-error-lighter text-error-dark' } },
    { variant: 'stroke', color: 'error', class: { root: 'text-error-dark' } },
    { variant: 'filled', color: 'success', class: { root: 'bg-success-base text-static-black' } },
    { variant: 'light', color: 'success', class: { root: 'bg-success-light text-success-dark' } },
    { variant: 'lighter', color: 'success', class: { root: 'bg-success-lighter text-success-dark' } },
    { variant: 'stroke', color: 'success', class: { root: 'text-success-dark' } },
    { variant: 'filled', color: 'away', class: { root: 'bg-away-base text-static-black' } },
    { variant: 'light', color: 'away', class: { root: 'bg-away-light text-away-dark' } },
    { variant: 'lighter', color: 'away', class: { root: 'bg-away-lighter text-away-dark' } },
    { variant: 'stroke', color: 'away', class: { root: 'text-away-dark' } },
    { variant: 'filled', color: 'feature', class: { root: 'bg-feature-base text-static-black' } },
    { variant: 'light', color: 'feature', class: { root: 'bg-feature-light text-feature-dark' } },
    { variant: 'lighter', color: 'feature', class: { root: 'bg-feature-lighter text-feature-dark' } },
    { variant: 'stroke', color: 'feature', class: { root: 'text-feature-dark' } },
    { variant: 'filled', color: 'verified', class: { root: 'bg-verified-base text-static-black' } },
    { variant: 'light', color: 'verified', class: { root: 'bg-verified-light text-verified-dark' } },
    { variant: 'lighter', color: 'verified', class: { root: 'bg-verified-lighter text-verified-dark' } },
    { variant: 'stroke', color: 'verified', class: { root: 'text-verified-dark' } },
    { variant: 'filled', color: 'highlighted', class: { root: 'bg-highlighted-base text-static-black' } },
    { variant: 'light', color: 'highlighted', class: { root: 'bg-highlighted-light text-highlighted-dark' } },
    { variant: 'lighter', color: 'highlighted', class: { root: 'bg-highlighted-lighter text-highlighted-dark' } },
    { variant: 'stroke', color: 'highlighted', class: { root: 'text-highlighted-dark' } },
    { variant: 'filled', color: 'stable', class: { root: 'bg-stable-base text-static-black' } },
    { variant: 'light', color: 'stable', class: { root: 'bg-stable-light text-stable-dark' } },
    { variant: 'lighter', color: 'stable', class: { root: 'bg-stable-lighter text-stable-dark' } },
    { variant: 'stroke', color: 'stable', class: { root: 'text-stable-dark' } },
    { variant: 'filled', color: 'faded', class: { root: 'bg-faded-base text-static-black' } },
    { variant: 'light', color: 'faded', class: { root: 'bg-faded-light text-faded-dark' } },
    { variant: 'lighter', color: 'faded', class: { root: 'bg-faded-lighter text-faded-dark' } },
    { variant: 'stroke', color: 'faded', class: { root: 'text-faded-dark' } },
    { size: 'small', square: true, class: { root: 'min-w-5 px-1' } },
    { size: 'medium', square: true, class: { root: 'min-w-6 px-1.5' } },
  ],
  defaultVariants: {
    variant: 'lighter',
    size: 'medium',
    color: 'primary',
  },
});

type BadgeSharedProps = VariantProps<typeof badgeVariants>;

type BadgeRootProps = VariantProps<typeof badgeVariants> &
  React.HTMLAttributes<HTMLSpanElement> & {
    asChild?: boolean;
  };

const BadgeRoot = React.forwardRef<HTMLSpanElement, BadgeRootProps>(
  (
    {
      asChild,
      size,
      variant,
      color,
      disabled,
      square,
      children,
      className,
      ...rest
    },
    forwardedRef,
  ) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'span';
    const { root } = badgeVariants({ size, variant, color, disabled, square });

    const sharedProps: BadgeSharedProps = {
      size,
      variant,
      color,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [BADGE_ICON_NAME, BADGE_DOT_NAME],
      uniqueId,
      asChild,
    );

    return (
      <Component
        ref={forwardedRef}
        className={root({ class: className })}
        {...rest}
      >
        {extendedChildren}
      </Component>
    );
  },
);
BadgeRoot.displayName = BADGE_ROOT_NAME;

function BadgeIcon<T extends React.ElementType>({
  className,
  size,
  variant,
  color,
  as,
  ...rest
}: PolymorphicComponentProps<T, BadgeSharedProps>) {
  const Component = as || 'span';
  const { icon } = badgeVariants({ size, variant, color });

  return <Component className={icon({ class: className })} {...rest} />;
}
BadgeIcon.displayName = BADGE_ICON_NAME;

type BadgeDotProps = BadgeSharedProps &
  Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>;

function BadgeDot({ size, variant, color, className, ...rest }: BadgeDotProps) {
  const { dot } = badgeVariants({ size, variant, color });

  return <div className={dot({ class: className })} {...rest} />;
}
BadgeDot.displayName = BADGE_DOT_NAME;

export { BadgeRoot as Root, BadgeIcon as Icon, BadgeDot as Dot };
