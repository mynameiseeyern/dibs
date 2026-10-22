// AlignUI Input v0.0.0

import * as React from 'react';
import { tv, type VariantProps } from '@/utils/tv';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { Slot } from '@radix-ui/react-slot';

const INPUT_ROOT_NAME = 'InputRoot';
const INPUT_WRAPPER_NAME = 'InputWrapper';
const INPUT_EL_NAME = 'InputEl';
const INPUT_ICON_NAME = 'InputIcon';
const INPUT_AFFIX_NAME = 'InputAffixButton';
const INPUT_INLINE_AFFIX_NAME = 'InputInlineAffixButton';

// AlignUI's Input API, styled to the Dibs Input: 44px, radius-md, a 1.5px stroke-sub-300 border,
// violet border and soft violet halo on focus, and 16px text so phones don't zoom in.
export const inputVariants = tv({
  slots: {
    root: [
      'group relative flex w-full min-w-0 overflow-hidden bg-bg-white-0 font-sans text-text-strong-950 shadow-xs',
      'border-[1.5px] border-stroke-sub-300',
      'transition-[border-color,box-shadow] duration-160 ease-out',
      'divide-x divide-stroke-soft-200',
      'has-[input:focus]:border-primary-base has-[input:focus]:shadow-[0_0_0_4px_var(--primary-lighter)]',
      'has-[input:disabled]:border-stroke-soft-200 has-[input:disabled]:shadow-none',
    ],
    wrapper: [
      'group/input-wrapper flex w-full min-w-0 cursor-text items-center bg-bg-white-0',
      'has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-bg-soft-200',
    ],
    input: [
      'w-full min-w-0 bg-transparent bg-none text-paragraph-md text-text-strong-950 outline-none',
      'placeholder:select-none placeholder:text-text-soft-400',
      'focus:outline-none',
      'disabled:text-text-disabled-300 disabled:placeholder:text-text-disabled-300',
    ],
    icon: [
      'flex size-5 shrink-0 select-none items-center justify-center text-[20px] leading-none text-text-soft-400',
      'group-has-[input:disabled]/input-wrapper:text-text-disabled-300',
    ],
    affix: [
      'shrink-0 bg-bg-weak-50 text-paragraph-md text-text-sub-600',
      'flex items-center justify-center truncate',
    ],
    inlineAffix: ['text-paragraph-md text-text-sub-600'],
  },
  variants: {
    size: {
      large: {
        root: 'min-h-13 rounded-md',
        wrapper: 'gap-2 px-4',
        input: 'self-stretch',
      },
      medium: {
        root: 'min-h-11 rounded-md',
        wrapper: 'gap-2 px-4',
        input: 'self-stretch',
      },
      small: {
        root: 'min-h-9 rounded-sm',
        wrapper: 'gap-2 px-3',
        input: 'self-stretch text-paragraph-sm',
      },
    },
    hasError: {
      true: {
        root: 'border-error-base has-[input:focus]:border-error-base has-[input:focus]:shadow-[0_0_0_4px_var(--error-lighter)]',
      },
      false: {},
    },
  },
  compoundVariants: [
    { size: ['large', 'medium'], class: { affix: 'px-4' } },
    { size: 'small', class: { affix: 'px-3' } },
  ],
  defaultVariants: {
    size: 'medium',
  },
});

type InputSharedProps = VariantProps<typeof inputVariants>;

function InputRoot({
  className,
  children,
  size,
  hasError,
  asChild,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> &
  InputSharedProps & {
    asChild?: boolean;
  }) {
  const uniqueId = React.useId();
  const Component = asChild ? Slot : 'div';

  const { root } = inputVariants({
    size,
    hasError,
  });

  const sharedProps: InputSharedProps = {
    size,
    hasError,
  };

  const extendedChildren = recursiveCloneChildren(
    children as React.ReactElement[],
    sharedProps,
    [
      INPUT_WRAPPER_NAME,
      INPUT_EL_NAME,
      INPUT_ICON_NAME,
      INPUT_AFFIX_NAME,
      INPUT_INLINE_AFFIX_NAME,
    ],
    uniqueId,
    asChild,
  );

  return (
    <Component className={root({ class: className })} {...rest}>
      {extendedChildren}
    </Component>
  );
}
InputRoot.displayName = INPUT_ROOT_NAME;

function InputWrapper({
  className,
  children,
  size,
  hasError,
  asChild,
  ...rest
}: React.HTMLAttributes<HTMLLabelElement> &
  InputSharedProps & {
    asChild?: boolean;
  }) {
  const Component = asChild ? Slot : 'label';

  const { wrapper } = inputVariants({
    size,
    hasError,
  });

  return (
    <Component className={wrapper({ class: className })} {...rest}>
      {children}
    </Component>
  );
}
InputWrapper.displayName = INPUT_WRAPPER_NAME;

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> &
    InputSharedProps & {
      asChild?: boolean;
    }
>(
  (
    { className, type = 'text', size, hasError, asChild, ...rest },
    forwardedRef,
  ) => {
    const Component = asChild ? Slot : 'input';

    const { input } = inputVariants({
      size,
      hasError,
    });

    return (
      <Component
        type={type}
        className={input({ class: className })}
        ref={forwardedRef}
        {...rest}
      />
    );
  },
);
Input.displayName = INPUT_EL_NAME;

function InputIcon<T extends React.ElementType = 'div'>({
  size,
  hasError,
  as,
  className,
  ...rest
}: PolymorphicComponentProps<T, InputSharedProps>) {
  const Component = as || 'div';
  const { icon } = inputVariants({ size, hasError });

  return <Component className={icon({ class: className })} {...rest} />;
}
InputIcon.displayName = INPUT_ICON_NAME;

function InputAffix({
  className,
  children,
  size,
  hasError,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & InputSharedProps) {
  const { affix } = inputVariants({
    size,
    hasError,
  });

  return (
    <div className={affix({ class: className })} {...rest}>
      {children}
    </div>
  );
}
InputAffix.displayName = INPUT_AFFIX_NAME;

function InputInlineAffix({
  className,
  children,
  size,
  hasError,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & InputSharedProps) {
  const { inlineAffix } = inputVariants({
    size,
    hasError,
  });

  return (
    <span className={inlineAffix({ class: className })} {...rest}>
      {children}
    </span>
  );
}
InputInlineAffix.displayName = INPUT_INLINE_AFFIX_NAME;

export {
  InputRoot as Root,
  InputWrapper as Wrapper,
  Input,
  InputIcon as Icon,
  InputAffix as Affix,
  InputInlineAffix as InlineAffix,
};
