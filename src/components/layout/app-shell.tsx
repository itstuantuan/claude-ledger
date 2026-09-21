'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, PanelLeft, Search, ChevronRight, ChevronDown, LogOut, UserRound, Store, X, Check, ChevronsUpDown, BookOpen, ClipboardList, UsersRound, PackageOpen, Settings, Landmark } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useMutation } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { authApi, isMock } from '@/lib/api/auth';
import { roleLabels } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { navigation } from './navigation';

const dropdownClass = 'z-75 min-w-[200px] rounded-[10px] border border-[#e0e3da] bg-[#fcfcfb] p-1.5 text-[#30372f] shadow-[0_10px_40px_#18271a1a]';
const dropdownItemClass = 'flex cursor-pointer items-center gap-2.5 rounded-md p-2.5 text-xs outline-none data-[highlighted]:bg-[#efeeeb] data-[disabled]:cursor-wait data-[disabled]:opacity-50';
const groupIcons = { '业务管理': ClipboardList, '客户管理': UsersRound, '材料管理': PackageOpen, '财务管理': Landmark, '系统': Settings };

export function AppShell({ children }: { children: ReactNode }) {
  const { collapsed, toggleSidebar } = useUiStore();
  const user = useAuthStore((state) => state.user);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(navigation.map((item) => item.group).filter((group) => group !== '工作空间')));
  const pathname = usePathname();
  const router = useRouter();
  const logout = useMutation({ mutationFn: authApi.logout, onSuccess: () => router.replace('/login') });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearch((value) => !value);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const groups = Array.from(new Set(navigation.map((item) => item.group)));

  function toggleGroup(group: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function renderSidebar(compact = false) {
    const mini = compact && collapsed;
    return <>
      <div className="flex h-[72px] shrink-0 items-center justify-between px-4">
        {!mini && <Link className="font-serif text-xl text-[#11110f]" href="/dashboard" onClick={() => setMobile(false)}>Ledger Console</Link>}
        {compact && <button className={cn('grid size-8 place-items-center rounded-md border-0 bg-transparent text-[#77756e] hover:bg-[#efeeeb]', mini && 'mx-auto')} aria-label={collapsed ? '展开侧栏' : '折叠侧栏'} aria-expanded={!collapsed} onClick={toggleSidebar}><PanelLeft size={17} /></button>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className={cn('mb-4 flex h-10 items-center gap-2 rounded-lg bg-[#efeeeb] px-2.5 text-xs text-[#52514e]', mini && 'justify-center px-0')}><span className="grid size-6 shrink-0 place-items-center rounded-md bg-white text-[#52514e]"><Store size={15} /></span>{!mini && <><span>油漆门店</span><span className="ml-auto text-[10px] text-[#8a8985]">经营管理</span></>}</div>
        <button className={cn('mb-5 flex h-10 w-full items-center gap-2 rounded-lg border border-[#deded9] bg-white px-2.5 text-left text-xs text-[#77756e]', mini && 'justify-center px-0')} onClick={() => { setMobile(false); setSearch(true); }}><Search size={16} />{!mini && <><span>搜索页面…</span><kbd className="ml-auto text-[10px]">⌘ K</kbd></>}</button>
        <nav className="grid" aria-label="主导航">{groups.map((group) => {
          const items = navigation.filter((item) => item.group === group);
          if (mini || group === '工作空间') return <div className={cn('grid gap-0.5', !mini && 'mb-2')} key={group}>{items.map(({ href, label, icon: Icon }) => { const selected = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} title={label} aria-current={selected ? 'page' : undefined} className={cn('flex h-10 items-center gap-3 rounded-lg px-2.5 text-[13px] text-[#555550] transition-colors hover:bg-[#ededeb]', selected && 'bg-[#e4e4e1] font-medium text-[#171714]', mini && 'justify-center px-0')} onClick={() => setMobile(false)}><Icon className="shrink-0 text-[#8f8f89]" size={18} strokeWidth={1.7} />{!mini && <span>{label}</span>}</Link>; })}</div>;
          const GroupIcon = groupIcons[group as keyof typeof groupIcons];
          const isOpen = openGroups.has(group);
          const groupId = `sidebar-group-${group}`;
          return <div className="mt-2" key={group}>
            <button type="button" className="flex h-10 w-full items-center gap-3 rounded-lg border-0 bg-transparent px-2.5 text-left text-[13px] font-medium text-[#555550] transition-colors hover:bg-[#ededeb]" aria-expanded={isOpen} aria-controls={groupId} onClick={() => toggleGroup(group)}><GroupIcon className="shrink-0 text-[#8f8f89]" size={18} strokeWidth={1.7}/><span>{group}</span><ChevronDown className={cn('ml-auto text-[#8f8f89] transition-transform', !isOpen && '-rotate-90')} size={14}/></button>
            {isOpen && <div id={groupId} className="grid gap-0.5">{items.map(({ href, label }) => { const selected = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} title={label} aria-current={selected ? 'page' : undefined} className={cn('flex h-9 items-center rounded-lg pl-10 pr-3 text-[13px] text-[#555550] transition-colors hover:bg-[#ededeb] hover:text-[#171714]', selected && 'bg-[#e4e4e1] font-medium text-[#171714]')} onClick={() => setMobile(false)}>{label}</Link>; })}</div>}
          </div>;
        })}</nav>
      </div>
      <div className="shrink-0 border-t border-[#e7e7e3] p-2">
        <button className={cn('flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-xs text-[#66645f] hover:bg-[#f0efec]', mini && 'justify-center px-0')}><Bell size={17}/>{!mini&&<span>消息通知</span>}</button>
        <a className={cn('flex h-10 items-center gap-3 rounded-lg px-2.5 text-xs text-[#66645f] hover:bg-[#f0efec]', mini&&'justify-center px-0')} href="/" target="_blank"><BookOpen size={17}/>{!mini&&<span>首页</span>}</a>
        {!mini&&<div className="mx-2 my-1 flex items-center gap-2 text-[10px] text-[#8a8985]"><span className="size-1.5 rounded-full bg-[#77756e]"/>{isMock?'本地模拟环境':'门店经营管理系统'}</div>}
        <DropdownMenu.Root><DropdownMenu.Trigger asChild><button className={cn('mt-1 flex min-h-14 w-full items-center gap-2.5 rounded-lg border-0 bg-transparent px-2 text-left hover:bg-[#f0efec]',mini&&'justify-center px-0')}><span className="grid size-8 shrink-0 place-items-center rounded-lg border border-black/10 bg-[#efeeeb] text-xs text-[#52514e]">{user?.name.slice(0,1)}</span>{!mini&&<><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-medium">{user?.name}</strong><small className="mt-1 block truncate text-[10px] text-[#8a8985]">{user?roleLabels[user.role]:''} · {user?.account}</small></span><ChevronsUpDown size={13}/></>}</button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className={dropdownClass} align="start" side="right" sideOffset={8}><DropdownMenu.Label className="block p-2.5 text-[13px]">{user?.name}<small className="mt-1.5 block text-[11px] text-[#77756e]">{user?roleLabels[user.role]:''} · {user?.account}</small></DropdownMenu.Label><DropdownMenu.Separator className="my-1 h-px bg-[#e7e7e3]"/><DropdownMenu.Item asChild><Link href="/account" className={dropdownItemClass}><UserRound size={16}/>我的账号</Link></DropdownMenu.Item><DropdownMenu.Item className={dropdownItemClass} disabled={logout.isPending} onSelect={event=>{event.preventDefault();logout.mutate();}}><LogOut size={16}/>{logout.isPending?'正在退出…':'退出登录'}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
      </div>
    </>;
  }

  return <div className="min-h-svh bg-[#fcfcfb] text-[#20211f] [font-variant-numeric:tabular-nums]">
    <a href="#main-content" className="fixed left-6 top-[-60px] z-90 bg-white p-3 focus:top-2">跳转到内容</a>
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#e7e7e3] bg-[#f9f9f7] transition-[width] max-[900px]:hidden', collapsed ? 'w-[60px]' : 'w-[272px]')}>{renderSidebar(true)}</aside>
    <Dialog open={mobile} onOpenChange={setMobile}><DialogContent className="left-0 top-0 flex h-svh max-h-svh w-[280px] max-w-[85vw] translate-x-0 translate-y-0 flex-col rounded-none bg-[#f9f9f7] p-0"><DialogTitle className="sr-only">主导航</DialogTitle><DialogDescription className="sr-only">选择工作台或我的账号</DialogDescription>{renderSidebar()}</DialogContent></Dialog>
    <main className={cn('flex min-h-svh flex-col bg-[#fcfcfb] transition-[margin] max-[900px]:ml-0', collapsed ? 'ml-[60px]' : 'ml-[272px]')}>
      <Button variant="outline" size="icon" className="fixed left-4 top-4 z-50 hidden bg-[#fcfcfb] max-[900px]:inline-flex" aria-label="打开菜单" onClick={()=>setMobile(true)}><PanelLeft size={18}/></Button>
      <div id="main-content" className="w-full flex-1 bg-[#fcfcfb] px-8 pt-[26px] outline-none max-[1200px]:px-6 max-[900px]:pt-[66px] max-[600px]:px-4" tabIndex={-1}>{children}</div>
    </main>
    <Dialog open={search} onOpenChange={(value) => { setSearch(value); if (!value) setQuery(''); }}><DialogContent><DialogTitle>搜索页面</DialogTitle><DialogDescription>快速前往当前已开放的页面</DialogDescription><div className="mt-5 flex items-center gap-2 rounded-lg border border-[#deded9] bg-white px-2.5 text-[#8c9684]"><Search size={17} /><Input className="border-0 px-0 shadow-none focus-visible:outline-none" aria-label="搜索页面名称" placeholder="输入页面名称…" value={query} onChange={(event) => setQuery(event.target.value)} /><Button size="icon" variant="ghost" aria-label="清空搜索" onClick={() => setQuery('')}><X size={15} /></Button></div><div className="mt-3.5">{navigation.filter((item) => `${item.label}${item.description}`.includes(query.trim())).map(({ href, label, description, icon: Icon }) => <Link className="flex items-center gap-3 rounded-lg p-2.5 text-[#52514e] hover:bg-[#f0efec] focus:bg-[#f0efec] [&>svg:last-child]:ml-auto" key={href} href={href} onClick={() => setSearch(false)}><Icon size={18} /><span><strong className="block text-[13px] font-medium">{label}</strong><small className="mt-1 block text-[11px] text-[#8a8985]">{description}</small></span>{href === pathname ? <Check size={16} /> : <ChevronRight size={16} />}</Link>)}{navigation.filter((item) => `${item.label}${item.description}`.includes(query.trim())).length === 0 && <p className="px-2.5 py-6 text-center text-xs text-[#8a8985]">没有找到匹配的页面，试试“工作台”或“账号”。</p>}</div></DialogContent></Dialog>
  </div>;
}
