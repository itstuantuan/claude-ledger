'use client';
import type { ComponentProps } from 'react';
import { Dialog as Primitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export function DialogContent({ children, className, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Overlay className="fixed inset-0 z-60 bg-[#161e1870]" /><Primitive.Content className={cn('fixed left-1/2 top-1/2 z-61 max-h-[calc(100svh-32px)] w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[17px] border border-[#e7e7e3] bg-[#fcfcfb] p-[26px] text-[#20211f] shadow-[0_20px_90px_#0003] [&>h2]:mr-[30px] [&>h2]:mb-2 [&>h2]:font-serif [&>h2]:text-[23px] [&>h2]:font-medium [&>p]:mb-5 [&>p]:text-[13px] [&>p]:text-[#787d75]', className)} {...props}>{children}<Primitive.Close className="absolute right-4 top-4 grid size-7 place-items-center rounded-md border-0 bg-transparent text-[#7e857b] hover:bg-[#ecede8] focus-visible:outline-2 focus-visible:outline-[#51715d]" aria-label="关闭弹窗"><X size={18} /></Primitive.Close></Primitive.Content></Primitive.Portal>;
}
