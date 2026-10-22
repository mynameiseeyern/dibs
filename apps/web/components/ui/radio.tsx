'use client';

// AlignUI Radio v0.0.0 (Radix RadioGroup), styled to the Dibs Radio: 22px circle,
// a 1.5px border, violet with a white dot when picked.

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/utils/cn';

const RadioGroup = RadioGroupPrimitive.Root;
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <RadioGroupPrimitive.Item
      ref={forwardedRef}
      className={cn(
        'peer grid size-[22px] shrink-0 cursor-pointer place-content-center rounded-full',
        'border-[1.5px] border-stroke-sub-300 bg-bg-white-0',
        'transition-transform duration-160 ease-spring motion-reduce:transition-none',
        'data-[state=checked]:scale-[1.06] data-[state=checked]:border-primary-base data-[state=checked]:bg-primary-base',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        'disabled:cursor-not-allowed disabled:border-stroke-soft-200 disabled:bg-bg-soft-200',
        className,
      )}
      {...rest}
    >
      <RadioGroupPrimitive.Indicator className='size-2 rounded-full bg-static-white' />
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup as Group, RadioGroupItem as Item };
