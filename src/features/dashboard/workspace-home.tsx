'use client';

import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, ClipboardList, Users, Paintbrush } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { roleLabels } from '@/lib/auth/permissions';
import { Button } from '@/components/ui/button';
import { isMock } from '@/lib/api/auth';

const modules = [
  { icon: Users, title: '客户与工地', description: '油漆工、施工队、工地项目，清楚记录每一次合作。', status: '下一阶段' },
  { icon: Paintbrush, title: '材料与用料', description: '材料资料、客户价格、用料单和退料记录。', status: '待开放' },
  { icon: ClipboardList, title: '账款与对账', description: '收款、预存、往来明细与客户对账。', status: '待开放' },
];

export function WorkspaceHome() {
  const user = useAuthStore((state) => state.user);

  return <>
    <header className="mb-8 flex items-end justify-between gap-5 max-[600px]:flex-col max-[600px]:items-start">
      <div>
        <p className="mb-2 text-xs text-[#8a8985]">门店工作台</p>
        <h1 className="font-serif text-[30px] font-medium tracking-[-.6px] text-[#11110f]">欢迎回来，{user?.name}</h1>
        <p className="mt-2.5 text-[13px] text-[#77756e]">账目清楚，经营有数。</p>
      </div>
      <Button asChild variant="outline"><Link href="/account"><ShieldCheck size={16} />查看账号权限</Link></Button>
    </header>

    {isMock && <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-black/10 bg-[#f7f7f5] px-4 py-3 text-xs text-[#66645f]">
      <span className="size-1.5 shrink-0 rounded-full bg-[#77756e]" />
      <p>当前为模拟环境，仅供登录与界面体验。业务功能将分阶段开放。</p>
    </div>}

    <section className="relative mb-5 min-h-[270px] overflow-hidden rounded-2xl border border-black/10 bg-[#fcfcfb] p-9 max-[600px]:min-h-0 max-[600px]:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(138,137,133,.22)_1px,transparent_1.2px)] bg-[size:14px_14px] [mask-image:linear-gradient(90deg,transparent_30%,black)] max-[700px]:hidden" aria-hidden="true" />
      <div className="relative z-10 max-w-[520px]">
        <span className="text-[11px] text-[#77756e]">云记账 · 油漆门店</span>
        <h2 className="my-4 font-serif text-[32px] font-medium leading-[1.35] tracking-[-.7px] text-[#11110f] max-[600px]:text-[27px]">从每一笔往来，<br />看清门店经营。</h2>
        <p className="text-[13px] leading-6 text-[#66645f]">客户、工地、材料与账款，在同一个工作空间里有序管理。</p>
        <div className="mt-7 flex items-center gap-2.5 text-xs text-[#52514e]">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-black/10 bg-white">{user?.name.slice(0, 1)}</span>
          <span>{user?.name}<small className="mt-1 block text-[10px] text-[#8a8985]">{user ? roleLabels[user.role] : ''} · 账号已登录</small></span>
          <ShieldCheck className="ml-2 text-[#77756e]" size={18} />
        </div>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-[#fcfcfb]">
      <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5 max-[600px]:px-5">
        <div><h2 className="text-base font-medium text-[#11110f]">门店业务</h2><p className="mt-1.5 text-xs text-[#8a8985]">以下模块尚未开放，现有本地账本数据已保留。</p></div>
        <span className="whitespace-nowrap rounded-md border border-black/10 bg-[#f7f7f5] px-2 py-1 text-[10px] text-[#66645f]">陆续开放</span>
      </div>
      <div className="grid grid-cols-3 max-[900px]:grid-cols-1">
        {modules.map(({ icon: Icon, title, description, status }, index) => <article className="group flex min-h-[190px] flex-col border-black/10 p-6 transition-colors hover:bg-[#f7f7f5] max-[900px]:min-h-0 max-[900px]:border-b max-[900px]:last:border-b-0 min-[901px]:border-r min-[901px]:last:border-r-0" key={title}>
          <span className="grid size-9 place-items-center rounded-lg border border-black/10 bg-white text-[#52514e]"><Icon size={18} strokeWidth={1.6} /></span>
          <div className="mt-8 max-[900px]:mt-5"><h3 className="text-sm font-medium text-[#22211f]">{title}</h3><p className="mt-2 text-xs leading-5 text-[#77756e]">{description}</p></div>
          <span className="mt-auto pt-5 text-[10px] text-[#8a8985]">{String(index + 1).padStart(2, '0')} · {status}</span>
        </article>)}
      </div>
    </section>

    <div className="mt-5 flex items-center justify-between text-[11px] text-[#8a8985]">
      <span>当前登录身份：{user ? roleLabels[user.role] : ''}</span>
      <Link className="flex items-center gap-1 text-[#52514e] hover:text-black" href="/account">查看我的账号<ArrowUpRight size={14} /></Link>
    </div>
  </>;
}
