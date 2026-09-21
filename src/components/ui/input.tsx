import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
export function Input({ className, ...props }: ComponentProps<'input'>) { return <input data-slot="input" className={cn('h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm text-[#11110f] placeholder:text-[#8a8985] hover:border-[#b7b6b1] focus-visible:border-[#7f95a9] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6289ab26] disabled:bg-[#f4f3f0] aria-invalid:border-[#b34c42]', className)} {...props} />; }
