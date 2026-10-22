// AlignUI Alert v0.0.0

import * as React from 'react';
import { tv, type VariantProps, type ClassValue } from '@/utils/tv';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { RiCloseLine } from '@remixicon/react';

const ALERT_ROOT_NAME = 'AlertRoot';
const ALERT_ICON_NAME = 'AlertIcon';
const ALERT_CLOSE_ICON_NAME = 'AlertCloseIcon';

// AlignUI's Alert API, styled to the Dibs Alert: soft fill with -dark text (lighter, the default),
// radius-lg, Figtree 14/22, a 20px icon and an optional bold title line.
export const alertVariants = tv({
  slots: {
    root: 'w-full font-sans [&_strong]:block [&_strong]:text-label-md',
    wrapper: [
      'grid w-full auto-cols-auto grid-flow-col grid-cols-1 items-start',
      'has-[>svg:first-child]:grid-cols-[auto_minmax(0,1fr)] has-[>i:first-child]:grid-cols-[auto_minmax(0,1fr)]',
      'transition duration-200 ease-out group-data-[expanded=false]/toast:group-data-[front=false]/toast:opacity-0',
    ],
    icon: 'shrink-0 text-[20px] leading-[22px]',
    closeIcon: 'opacity-60',
  },
  variants: {
    variant: {
      filled: { root: 'text-static-black' },
      light: {},
      lighter: {},
      stroke: { root: 'bg-bg-white-0 text-text-strong-950 shadow-md ring-1 ring-inset ring-stroke-soft-200' },
    },
    status: {
      error: {},
      warning: {},
      success: {},
      information: {},
      feature: {},
      away: {},
    },
    size: {
      small: {
        root: 'rounded-md px-3 py-2.5 text-paragraph-sm',
        wrapper: 'gap-2',
        icon: 'size-5',
        closeIcon: 'size-5',
      },
      large: {
        root: 'rounded-lg p-4 text-paragraph-sm',
        wrapper: 'gap-3',
        icon: 'size-5',
        closeIcon: 'size-5',
      },
    },
  },
  compoundVariants: [
    { variant: 'filled', status: 'error', class: { root: 'bg-error-base' } },
    { variant: 'light', status: 'error', class: { root: 'bg-error-light text-error-dark' } },
    { variant: 'lighter', status: 'error', class: { root: 'bg-error-lighter text-error-dark' } },
    { variant: 'stroke', status: 'error', class: { icon: 'text-error-dark' } },
    { variant: 'filled', status: 'warning', class: { root: 'bg-warning-base' } },
    { variant: 'light', status: 'warning', class: { root: 'bg-warning-light text-warning-dark' } },
    { variant: 'lighter', status: 'warning', class: { root: 'bg-warning-lighter text-warning-dark' } },
    { variant: 'stroke', status: 'warning', class: { icon: 'text-warning-dark' } },
    { variant: 'filled', status: 'success', class: { root: 'bg-success-base' } },
    { variant: 'light', status: 'success', class: { root: 'bg-success-light text-success-dark' } },
    { variant: 'lighter', status: 'success', class: { root: 'bg-success-lighter text-success-dark' } },
    { variant: 'stroke', status: 'success', class: { icon: 'text-success-dark' } },
    { variant: 'filled', status: 'information', class: { root: 'bg-information-base' } },
    { variant: 'light', status: 'information', class: { root: 'bg-information-light text-information-dark' } },
    { variant: 'lighter', status: 'information', class: { root: 'bg-information-lighter text-information-dark' } },
    { variant: 'stroke', status: 'information', class: { icon: 'text-information-dark' } },
    { variant: 'filled', status: 'feature', class: { root: 'bg-feature-base' } },
    { variant: 'light', status: 'feature', class: { root: 'bg-feature-light text-feature-dark' } },
    { variant: 'lighter', status: 'feature', class: { root: 'bg-feature-lighter text-feature-dark' } },
    { variant: 'stroke', status: 'feature', class: { icon: 'text-feature-dark' } },
    { variant: 'filled', status: 'away', class: { root: 'bg-away-base' } },
    { variant: 'light', status: 'away', class: { root: 'bg-away-light text-away-dark' } },
    { variant: 'lighter', status: 'away', class: { root: 'bg-away-lighter text-away-dark' } },
    { variant: 'stroke', status: 'away', class: { icon: 'text-away-dark' } },
  ],
  defaultVariants: {
    size: 'large',
    variant: 'lighter',
    status: 'information',
  },
});

type AlertSharedProps = VariantProps<typeof alertVariants>;

export type AlertProps = VariantProps<typeof alertVariants> &
  React.HTMLAttributes<HTMLDivElement> & {
    wrapperClassName?: ClassValue;
  };

const AlertRoot = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { children, className, wrapperClassName, size, variant, status, ...rest },
    forwardedRef,
  ) => {
    const uniqueId = React.useId();
    const { root, wrapper } = alertVariants({ size, variant, status });

    const sharedProps: AlertSharedProps = {
      size,
      variant,
      status,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [ALERT_ICON_NAME, ALERT_CLOSE_ICON_NAME],
      uniqueId,
    );

    return (
      <div ref={forwardedRef} className={root({ class: className })} {...rest}>
        <div className={wrapper({ class: wrapperClassName })}>
          {extendedChildren}
        </div>
      </div>
    );
  },
);
AlertRoot.displayName = ALERT_ROOT_NAME;

function AlertIcon<T extends React.ElementType>({
  size,
  variant,
  status,
  className,
  as,
}: PolymorphicComponentProps<T, AlertSharedProps>) {
  const Component = as || 'div';
  const { icon } = alertVariants({ size, variant, status });

  return <Component className={icon({ class: className })} />;
}
AlertIcon.displayName = ALERT_ICON_NAME;

function AlertCloseIcon<T extends React.ElementType>({
  size,
  variant,
  status,
  className,
  as,
}: PolymorphicComponentProps<T, AlertSharedProps>) {
  const Component = as || RiCloseLine;
  const { closeIcon } = alertVariants({ size, variant, status });

  return <Component className={closeIcon({ class: className })} />;
}
AlertCloseIcon.displayName = ALERT_CLOSE_ICON_NAME;

export { AlertRoot as Root, AlertIcon as Icon, AlertCloseIcon as CloseIcon };
