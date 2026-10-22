'use client';

// AlignUI TabMenuHorizontal v0.0.0

'use client';

import * as React from 'react';
import { Slottable } from '@radix-ui/react-slot';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import mergeRefs from 'merge-refs';
import { cn } from '@/utils/cn';
import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { useTabObserver } from '@/hooks/use-tab-observer';

const TabMenuHorizontalContent = TabsPrimitive.Content;
TabMenuHorizontalContent.displayName = 'TabMenuHorizontalContent';

const TabMenuHorizontalRoot = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Root>,
  Omit<React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>, 'orientation'>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <TabsPrimitive.Root
      ref={forwardedRef}
      orientation='horizontal'
      className={cn('w-full', className)}
      {...rest}
    />
  );
});
TabMenuHorizontalRoot.displayName = 'TabMenuHorizontalRoot';

const TabMenuHorizontalList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    wrapperClassName?: string;
  }
>(({ children, className, wrapperClassName, ...rest }, forwardedRef) => {
  const [lineStyle, setLineStyle] = React.useState({ width: 0, left: 0 });
  const listWrapperRef = React.useRef<HTMLDivElement>(null);

  const { mounted, listRef } = useTabObserver({
    onActiveTabChange: (_, activeTab) => {
      const { offsetWidth: width, offsetLeft: left } = activeTab;
      setLineStyle({ width, left });

      const listWrapper = listWrapperRef.current;
      if (listWrapper) {
        const containerWidth = listWrapper.clientWidth;
        const scrollPosition = left - containerWidth / 2 + width / 2;

        listWrapper.scrollTo({
          left: scrollPosition,
          behavior: 'smooth',
        });
      }
    },
  });

  return (
    <div
      ref={listWrapperRef}
      className={cn(
        'relative grid overflow-x-auto overflow-y-hidden overscroll-contain',
        wrapperClassName,
      )}
    >
      <TabsPrimitive.List
        ref={mergeRefs(forwardedRef, listRef)}
        className={cn(
          'group/tab-list relative flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]',
          // Radix can briefly focus the list itself (inline outline:none); an inset ring survives the scroll clip.
          'rounded-md focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring',
          className,
        )}
        {...rest}
      >
        <Slottable>{children}</Slottable>

        {/* Floating Bg */}
        <div
          className={cn(
            // Dibs tabs are pills, so the moving underline stays hidden.
            'hidden',
            {
              hidden: !mounted,
            },
          )}
          style={{
            transform: `translate3d(${lineStyle.left}px, 0, 0)`,
            width: `${lineStyle.width}px`,
            transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
          }}
          aria-hidden='true'
        />
      </TabsPrimitive.List>
    </div>
  );
});
TabMenuHorizontalList.displayName = 'TabMenuHorizontalList';

const TabMenuHorizontalTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <TabsPrimitive.Trigger
      ref={forwardedRef}
      className={cn(
        // base
        'group/tab-item inline-flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-full px-4 font-sans text-label-sm text-text-sub-600 not-data-[state=active]:hover:bg-bg-soft-200 not-data-[state=active]:hover:text-text-strong-950',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        'flex items-center justify-center gap-1.5',
        'transition duration-200 ease-out',
        // focus
        'focus:outline-none',
        // active
        'data-[state=active]:bg-primary-base data-[state=active]:text-static-white',
        className,
      )}
      {...rest}
    />
  );
});
TabMenuHorizontalTrigger.displayName = 'TabMenuHorizontalTrigger';

function TabMenuHorizontalIcon<T extends React.ElementType>({
  className,
  as,
  ...rest
}: PolymorphicComponentProps<T>) {
  const Component = as || 'div';

  return (
    <Component
      className={cn(
        // base
        'size-5 text-text-sub-600',
        'transition duration-200 ease-out',
        // active
        'group-data-[state=active]/tab-item:text-static-white',
        className,
      )}
      {...rest}
    />
  );
}
TabMenuHorizontalIcon.displayName = 'TabsHorizontalIcon';

function TabMenuHorizontalArrowIcon<T extends React.ElementType>({
  className,
  as,
  ...rest
}: PolymorphicComponentProps<T, React.HTMLAttributes<HTMLDivElement>>) {
  const Component = as || 'div';

  return (
    <Component
      className={cn('size-5 text-text-sub-600', className)}
      {...rest}
    />
  );
}
TabMenuHorizontalArrowIcon.displayName = 'TabsHorizontalArrow';

export {
  TabMenuHorizontalRoot as Root,
  TabMenuHorizontalList as List,
  TabMenuHorizontalTrigger as Trigger,
  TabMenuHorizontalIcon as Icon,
  TabMenuHorizontalArrowIcon as ArrowIcon,
  TabMenuHorizontalContent as Content,
};
