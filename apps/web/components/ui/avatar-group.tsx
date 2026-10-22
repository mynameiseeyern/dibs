// AlignUI AvatarGroup v0.0.0

import * as React from 'react';
import { tv, type VariantProps } from '@/utils/tv';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { AVATAR_ROOT_NAME } from './avatar';

const AVATAR_GROUP_ROOT_NAME = 'AvatarGroupRoot';
const AVATAR_GROUP_OVERFLOW_NAME = 'AvatarGroupOverflow';

export const avatarGroupVariants = tv({
  slots: {
    root: 'flex *:ring-2 *:ring-stroke-white-0',
    overflow:
      'relative flex shrink-0 items-center justify-center rounded-full bg-bg-soft-200 text-center font-sans font-bold leading-none text-text-sub-600',
  },
  variants: {
    size: {
      '80': {
        root: '-space-x-4',
        overflow: 'size-20 text-[22px]',
      },
      '72': {
        root: '-space-x-4',
        overflow: 'size-[72px] text-[22px]',
      },
      '64': {
        root: '-space-x-4',
        overflow: 'size-16 text-[22px]',
      },
      '56': {
        root: '-space-x-4',
        overflow: 'size-14 text-[22px]',
      },
      '48': {
        root: '-space-x-3',
        overflow: 'size-12 text-[19px]',
      },
      '40': {
        root: '-space-x-2.5',
        overflow: 'size-10 text-[16px]',
      },
      '32': {
        root: '-space-x-1.5',
        overflow: 'size-8 text-[13px]',
      },
      '24': {
        root: '-space-x-1',
        overflow: 'size-6 text-[10px]',
      },
      '20': {
        root: '-space-x-1',
        overflow: 'size-5 text-[8px]',
      },
    },
  },
  defaultVariants: {
    size: '40',
  },
});

type AvatarGroupSharedProps = VariantProps<typeof avatarGroupVariants>;

type AvatarGroupRootProps = VariantProps<typeof avatarGroupVariants> &
  React.HTMLAttributes<HTMLDivElement>;

function AvatarGroupRoot({
  children,
  size,
  className,
  ...rest
}: AvatarGroupRootProps) {
  const uniqueId = React.useId();
  const { root } = avatarGroupVariants({ size });

  const sharedProps: AvatarGroupSharedProps = {
    size,
  };

  const extendedChildren = recursiveCloneChildren(
    children as React.ReactElement[],
    sharedProps,
    [AVATAR_ROOT_NAME, AVATAR_GROUP_OVERFLOW_NAME],
    uniqueId,
  );

  return (
    <div className={root({ class: className })} {...rest}>
      {extendedChildren}
    </div>
  );
}
AvatarGroupRoot.displayName = AVATAR_GROUP_ROOT_NAME;

function AvatarGroupOverflow({
  children,
  size,
  className,
  ...rest
}: AvatarGroupSharedProps & React.HTMLAttributes<HTMLDivElement>) {
  const { overflow } = avatarGroupVariants({ size });

  return (
    <div className={overflow({ class: className })} {...rest}>
      {children}
    </div>
  );
}
AvatarGroupOverflow.displayName = AVATAR_GROUP_OVERFLOW_NAME;

export { AvatarGroupRoot as Root, AvatarGroupOverflow as Overflow };
