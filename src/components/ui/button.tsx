import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
// shadcn/ui Button composition, styled with the existing workspace theme.
const buttonVariants = cva('inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium shadow-[0_1px_2px_#0000000d] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f95a9] disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:shrink-0', { variants: { variant: { default: 'border-[#0b0b0b] bg-[#0b0b0b] text-white hover:bg-[#292826]', outline: 'border-black/15 bg-[#fcfcfb] text-[#11110f] hover:bg-[#f0efec]', ghost: 'border-transparent bg-transparent text-[#52514e] shadow-none hover:bg-[#efeeeb]' }, size: { default: '', icon: 'w-9 px-0' } }, defaultVariants: { variant: 'default', size: 'default' } });
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
