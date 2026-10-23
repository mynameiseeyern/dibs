// AlignUI Button v0.0.0, themed for Dibs

import * as React from 'react';
import { tv, type VariantProps } from '@/utils/tv';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { Slot } from '@radix-ui/react-slot';

const BUTTON_ROOT_NAME = 'ButtonRoot';
const BUTTON_ICON_NAME = 'ButtonIcon';

// AlignUI's Button API (variant × mode × size), styled to the Dibs Button:
// pills, Figtree 600, 44px default, spring press, and the lime "dibs" sticker.
// Hover styles only apply on real pointers (Tailwind v4's hover:), so taps don't stick.
export const buttonVariants = tv({
  slots: {
    root: [
      // base
      'group relative inline-flex items-center justify-center whitespace-nowrap rounded-full font-sans no-underline',
      'cursor-pointer select-none [-webkit-tap-highlight-color:transparent]',
      'transition-[transform,box-shadow,background-color,color] duration-160 ease-spring',
      'active:scale-96 motion-reduce:transition-none motion-reduce:active:scale-100',
      // focus
      'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
      // disabled
      'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-bg-soft-200 disabled:text-text-disabled-300 disabled:shadow-none disabled:active:scale-100',
    ],
    icon: [
      // base
      'flex shrink-0 items-center justify-center text-[20px] leading-none',
    ],
  },
  variants: {
    variant: {
      primary: {},
      neutral: {},
      error: {},
      dibs: {},
    },
    mode: {
      filled: {},
      stroke: {
        root: 'ring-[1.5px] ring-inset',
      },
      lighter: {},
      ghost: {},
    },
    size: {
      large: {
        root: 'min-h-13 gap-2 px-6 text-label-lg',
        icon: 'size-5',
      },
      medium: {
        root: 'min-h-11 gap-2 px-5 text-label-md',
        icon: 'size-5',
      },
      small: {
        // 36px to look at, 44px to tap: the hit area reaches 4px past the top and bottom.
        root: "min-h-9 gap-2 px-4 text-label-sm before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        icon: 'size-5',
      },
    },
    block: {
      true: { root: 'flex w-full' },
    },
    iconOnly: {
      true: { root: 'px-0' },
    },
  },
  compoundVariants: [
    { iconOnly: true, size: 'large', class: { root: 'w-13' } },
    { iconOnly: true, size: 'medium', class: { root: 'w-11' } },
    { iconOnly: true, size: 'small', class: { root: 'w-9 before:-inset-1' } },

    //#region variant=primary
    {
      variant: 'primary',
      mode: 'filled',
      class: { root: 'bg-primary-base text-static-white hover:bg-primary-hover active:bg-primary-hover' },
    },
    {
      variant: 'primary',
      mode: 'stroke',
      class: { root: 'bg-bg-white-0 text-primary-dark ring-primary-base hover:bg-primary-lighter' },
    },
    {
      variant: 'primary',
      mode: 'lighter',
      class: { root: 'bg-primary-lighter text-primary-dark hover:bg-primary-light active:bg-primary-light' },
    },
    {
      variant: 'primary',
      mode: 'ghost',
      class: { root: 'bg-transparent text-primary-dark hover:bg-primary-lighter active:bg-primary-lighter' },
    },
    //#endregion

    //#region variant=neutral
    {
      variant: 'neutral',
      mode: 'filled',
      class: { root: 'bg-bg-strong-950 text-text-white-0 hover:bg-bg-surface-800' },
    },
    {
      variant: 'neutral',
      mode: 'stroke',
      class: { root: 'bg-bg-white-0 text-text-strong-950 ring-stroke-soft-200 hover:bg-bg-weak-50' },
    },
    {
      variant: 'neutral',
      mode: 'lighter',
      class: { root: 'bg-bg-soft-200 text-text-strong-950 hover:bg-bg-sub-300 active:bg-bg-sub-300' },
    },
    {
      variant: 'neutral',
      mode: 'ghost',
      class: { root: 'bg-transparent text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950' },
    },
    //#endregion

    //#region variant=error
    {
      variant: 'error',
      mode: 'filled',
      class: { root: 'bg-error-base text-static-black hover:bg-error-light' },
    },
    {
      variant: 'error',
      mode: 'stroke',
      class: { root: 'bg-bg-white-0 text-error-dark ring-error-base hover:bg-error-lighter' },
    },
    {
      variant: 'error',
      mode: 'lighter',
      class: { root: 'bg-error-lighter text-error-dark hover:bg-error-light active:bg-error-light' },
    },
    {
      variant: 'error',
      mode: 'ghost',
      class: { root: 'bg-transparent text-error-dark hover:bg-error-lighter' },
    },
    //#endregion

    //#region variant=dibs — the sticker: lime, ink border, hard drop that it sinks into. Once per screen.
    {
      variant: 'dibs',
      class: {
        root: [
          'border-2 border-static-black bg-accent-base text-static-black shadow-pop',
          'hover:not-active:-translate-y-px hover:not-active:shadow-[0_5px_0_0_var(--static-black)]',
          'active:translate-y-1 active:scale-100 active:shadow-none',
          'disabled:hover:translate-y-0',
        ],
      },
    },
    //#endregion
  ],
  defaultVariants: {
    variant: 'primary',
    mode: 'filled',
    size: 'medium',
  },
});

type ButtonSharedProps = VariantProps<typeof buttonVariants>;

type ButtonRootProps = VariantProps<typeof buttonVariants> &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  };

const ButtonRoot = React.forwardRef<HTMLButtonElement, ButtonRootProps>(
  (
    { children, variant, mode, size, block, iconOnly, asChild, className, ...rest },
    forwardedRef,
  ) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'button';
    const { root } = buttonVariants({ variant, mode, size, block, iconOnly });

    const sharedProps: Pick<ButtonSharedProps, 'variant' | 'mode' | 'size'> = {
      variant,
      mode,
      size,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [BUTTON_ICON_NAME],
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
ButtonRoot.displayName = BUTTON_ROOT_NAME;

function ButtonIcon<T extends React.ElementType>({
  variant,
  mode,
  size,
  as,
  className,
  ...rest
}: PolymorphicComponentProps<T, ButtonSharedProps>) {
  const Component = as || 'span';
  const { icon } = buttonVariants({ mode, variant, size });

  return <Component className={icon({ class: className })} {...rest} />;
}
ButtonIcon.displayName = BUTTON_ICON_NAME;

export { ButtonRoot as Root, ButtonIcon as Icon };
