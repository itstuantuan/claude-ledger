'use client';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { projectStatusLabels, entityStatusLabels } from '@/features/customers/labels';
import type { ProjectStatus } from '@/features/customers/schema';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: 'ACTIVE' | 'DISABLED' | ProjectStatus }) {
  const label = status in projectStatusLabels ? projectStatusLabels[status as ProjectStatus] : entityStatusLabels[status as 'ACTIVE' | 'DISABLED'];
  return <span className={cn('inline-flex rounded-md px-2 py-1 text-[10px]', status === 'ACTIVE' && 'bg-[#edf3e9] text-[#567650]', status === 'DISABLED' || status === 'CANCELLED' ? 'bg-[#f3efed] text-[#8c7771]' : '', status === 'PLANNING' && 'bg-[#f5f0e5] text-[#85744f]', status === 'COMPLETED' && 'bg-[#edf0f4] text-[#657080]')}>{label}</span>;
}
export function SearchBox({ defaultValue, placeholder }: { defaultValue?: string; placeholder: string }) {
  return <label className="flex h-10 w-[360px] max-w-full shrink-0 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-[#8a8985] transition-shadow focus-within:border-[#7f95a9] focus-within:ring-[3px] focus-within:ring-[#6289ab26] max-[700px]:w-full"><Search className="shrink-0" size={16} /><input className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[#11110f] outline-none placeholder:text-[#8a8985]" name="search" defaultValue={defaultValue} placeholder={placeholder} /></label>;
}
export function EmptyState({ title = '暂无数据', description = '调整筛选条件后再试试。' }: { title?: string; description?: string }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-[#939a8e]"><Inbox size={28} /><strong className="text-sm text-[#55614c]">{title}</strong><p className="text-xs">{description}</p></div>;
}
export function Pagination({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex items-center justify-between border-t border-[#e7e7e3] px-4 py-3 text-[11px] text-[#8c9189]"><span>共 {total} 条 · 第 {page} / {pages} 页</span><div className="flex gap-1.5"><Button asChild variant="outline" size="icon" disabled={page <= 1}><Link className="aria-disabled:pointer-events-none aria-disabled:opacity-45" aria-label="上一页" aria-disabled={page <= 1} href={href(Math.max(1, page - 1))}><ChevronLeft size={15} /></Link></Button><Button asChild variant="outline" size="icon" disabled={page >= pages}><Link className="aria-disabled:pointer-events-none aria-disabled:opacity-45" aria-label="下一页" aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))}><ChevronRight size={15} /></Link></Button></div></div>;
}
export function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(value)) : '暂无交易';
}
