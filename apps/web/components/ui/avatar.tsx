// AlignUI Avatar v0.0.0

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/utils/cn';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv, type VariantProps } from '@/utils/tv';
import {
  IconEmptyCompany,
  IconEmptyUser,
} from '@/components/ui/avatar-empty-icons';

export const AVATAR_ROOT_NAME = 'AvatarRoot';
const AVATAR_IMAGE_NAME = 'AvatarImage';
const AVATAR_INDICATOR_NAME = 'AvatarIndicator';
const AVATAR_STATUS_NAME = 'AvatarStatus';
const AVATAR_BRAND_LOGO_NAME = 'AvatarBrandLogo';
const AVATAR_NOTIFICATION_NAME = 'AvatarNotification';

export const avatarVariants = tv({
  slots: {
    root: [
      'relative flex shrink-0 items-center justify-center rounded-full',
      'select-none text-center font-sans font-bold uppercase leading-none',
    ],
    image: 'size-full rounded-full object-cover',
    indicator:
      'absolute flex size-8 items-center justify-center drop-shadow-[0_2px_4px_#1b1c1d0a]',
  },
  variants: {
    size: {
      '80': {
        root: 'size-20 text-[32px]',
      },
      '72': {
        root: 'size-[72px] text-[29px]',
      },
      '64': {
        root: 'size-16 text-[26px]',
      },
      '56': {
        root: 'size-14 text-[22px]',
      },
      '48': {
        root: 'size-12 text-[19px]',
      },
      '40': {
        root: 'size-10 text-[16px]',
      },
      '32': {
        root: 'size-8 text-[13px]',
      },
      '24': {
        root: 'size-6 text-[10px]',
      },
      '20': {
        root: 'size-5 text-[8px]',
      },
    },
    // The Dibs crew colours (see the Dibs Avatar doc); gray is for the "+3" overflow.
    color: {
      violet: {
        root: 'bg-primary-light text-primary-darker',
      },
      lime: {
        root: 'bg-accent-base text-static-black',
      },
      sun: {
        root: 'bg-away-light text-away-dark',
      },
      mint: {
        root: 'bg-success-light text-success-dark',
      },
      tangerine: {
        root: 'bg-highlighted-light text-highlighted-dark',
      },
      sky: {
        root: 'bg-information-light text-information-dark',
      },
      coral: {
        root: 'bg-error-light text-error-dark',
      },
      rose: {
        root: 'bg-feature-light text-feature-dark',
      },
      aqua: {
        root: 'bg-verified-light text-verified-dark',
      },
      ivory: {
        root: 'bg-stable-light text-stable-dark',
      },
      gray: {
        root: 'bg-bg-soft-200 text-text-sub-600',
      },
    },
  },
  compoundVariants: [
    {
      size: ['80', '72'],
      class: {
        indicator: '-right-2',
      },
    },
    {
      size: '64',
      class: {
        indicator: '-right-2 scale-[.875]',
      },
    },
    {
      size: '56',
      class: {
        indicator: '-right-1.5 scale-75',
      },
    },
    {
      size: '48',
      class: {
        indicator: '-right-1.5 scale-[.625]',
      },
    },
    {
      size: '40',
      class: {
        indicator: '-right-1.5 scale-[.5625]',
      },
    },
    {
      size: '32',
      class: {
        indicator: '-right-1.5 scale-50',
      },
    },
    {
      size: '24',
      class: {
        indicator: '-right-1 scale-[.375]',
      },
    },
    {
      size: '20',
      class: {
        indicator: '-right-1 scale-[.3125]',
      },
    },
  ],
  defaultVariants: {
    size: '40',
    color: 'violet',
  },
});

type AvatarSharedProps = VariantProps<typeof avatarVariants>;

export type AvatarRootProps = VariantProps<typeof avatarVariants> &
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
    placeholderType?: 'user' | 'company';
  };

const AvatarRoot = React.forwardRef<HTMLDivElement, AvatarRootProps>(
  (
    {
      asChild,
      children,
      size,
      color,
      className,
      placeholderType = 'user',
      ...rest
    },
    forwardedRef,
  ) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'span';
    const { root } = avatarVariants({ size, color });

    const sharedProps: AvatarSharedProps = {
      size,
      color,
    };

    // use placeholder icon if no children provided
    if (!children) {
      return (
        <span className={root({ class: className })} {...rest}>
          <AvatarImage asChild>
            {placeholderType === 'company' ? (
              <IconEmptyCompany />
            ) : (
              <IconEmptyUser />
            )}
          </AvatarImage>
        </span>
      );
    }

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [AVATAR_IMAGE_NAME, AVATAR_INDICATOR_NAME],
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
AvatarRoot.displayName = AVATAR_ROOT_NAME;

type AvatarImageProps = AvatarSharedProps &
  Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'color'> & {
    asChild?: boolean;
  };

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ asChild, className, size, color, ...rest }, forwardedRef) => {
    const Component = asChild ? Slot : 'img';
    const { image } = avatarVariants({ size, color });

    return (
      <Component
        ref={forwardedRef}
        className={image({ class: className })}
        {...rest}
      />
    );
  },
);
AvatarImage.displayName = AVATAR_IMAGE_NAME;

function AvatarIndicator({
  size,
  color,
  className,
  position = 'bottom',
  ...rest
}: AvatarSharedProps &
  React.HTMLAttributes<HTMLDivElement> & {
    position?: 'top' | 'bottom';
  }) {
  const { indicator } = avatarVariants({ size, color });

  return (
    <div
      className={cn(indicator({ class: className }), {
        'top-0 origin-top-right': position === 'top',
        'bottom-0 origin-bottom-right': position === 'bottom',
      })}
      {...rest}
    />
  );
}
AvatarIndicator.displayName = AVATAR_INDICATOR_NAME;

export const avatarStatusVariants = tv({
  base: 'box-content size-3 rounded-full border-4 border-bg-white-0',
  variants: {
    status: {
      online: 'bg-success-base',
      offline: 'bg-faded-base',
      busy: 'bg-error-base',
      away: 'bg-away-base',
    },
  },
  defaultVariants: {
    status: 'online',
  },
});

function AvatarStatus({
  status,
  className,
  ...rest
}: VariantProps<typeof avatarStatusVariants> &
  React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={avatarStatusVariants({ status, class: className })}
      {...rest}
    />
  );
}
AvatarStatus.displayName = AVATAR_STATUS_NAME;

type AvatarBrandLogoProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  asChild?: boolean;
};

const AvatarBrandLogo = React.forwardRef<
  HTMLImageElement,
  AvatarBrandLogoProps
>(({ asChild, className, ...rest }, forwardedRef) => {
  const Component = asChild ? Slot : 'img';

  return (
    <Component
      ref={forwardedRef}
      className={cn(
        'box-content size-6 rounded-full border-2 border-bg-white-0',
        className,
      )}
      {...rest}
    />
  );
});
AvatarBrandLogo.displayName = AVATAR_BRAND_LOGO_NAME;

function AvatarNotification({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'box-content size-3 rounded-full border-2 border-bg-white-0 bg-error-base',
        className,
      )}
      {...rest}
    />
  );
}
AvatarNotification.displayName = AVATAR_NOTIFICATION_NAME;

export {
  AvatarRoot as Root,
  AvatarImage as Image,
  AvatarIndicator as Indicator,
  AvatarStatus as Status,
  AvatarBrandLogo as BrandLogo,
  AvatarNotification as Notification,
};
