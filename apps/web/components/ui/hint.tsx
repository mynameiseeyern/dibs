// AlignUI Hint v0.0.0

import * as React from 'react';
import { tv, type VariantProps } from '@/utils/tv';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { PolymorphicComponentProps } from '@/utils/polymorphic';

const HINT_ROOT_NAME = 'HintRoot';
const HINT_ICON_NAME = 'HintIcon';

export const hintVariants = tv({
  slots: {
    root: 'group flex items-center gap-1 font-sans text-paragraph-sm text-text-sub-600',
    icon: 'size-4 shrink-0 text-[16px] leading-none text-text-soft-400',
  },
  variants: {
    disabled: {
      true: {
        root: 'text-text-disabled-300',
        icon: 'text-text-disabled-300',
      },
    },
    hasError: {
      true: {
        root: 'text-error-dark',
        icon: 'text-error-dark',
      },
    },
  },
});

type HintSharedProps = VariantProps<typeof hintVariants>;

type HintRootProps = VariantProps<typeof hintVariants> &
  React.HTMLAttributes<HTMLDivElement>;

function HintRoot({
  children,
  hasError,
  disabled,
  className,
  ...rest
}: HintRootProps) {
  const uniqueId = React.useId();
  const { root } = hintVariants({ hasError, disabled });

  const sharedProps: HintSharedProps = {
    hasError,
    disabled,
  };

  const extendedChildren = recursiveCloneChildren(
    children as React.ReactElement[],
    sharedProps,
    [HINT_ICON_NAME],
    uniqueId,
  );

  return (
    <div className={root({ class: className })} {...rest}>
      {extendedChildren}
    </div>
  );
}
HintRoot.displayName = HINT_ROOT_NAME;

function HintIcon<T extends React.ElementType>({
  as,
  className,
  hasError,
  disabled,
  ...rest
}: PolymorphicComponentProps<T, HintSharedProps>) {
  const Component = as || 'div';
  const { icon } = hintVariants({ hasError, disabled });

  return <Component className={icon({ class: className })} {...rest} />;
}
HintIcon.displayName = HINT_ICON_NAME;

export { HintRoot as Root, HintIcon as Icon };
