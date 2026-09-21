'use client';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { authApi, isMock } from '@/lib/api/auth';
import { roleLabels } from '@/lib/auth/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/common/error-state';
const descriptions = { OWNER: '可管理门店全部业务和系统设置。', FINANCE: '可查看账务、登记收款与预存、查看资金流水、对账和统计。', CLERK: '可查看客户与材料、创建用料单及退料申请。' };
export function AccountPage() {
  const identity = useAuthStore((state) => state.user?.id);
  const query = useQuery({ queryKey: ['auth', 'me', identity], queryFn: ({ signal }) => authApi.me(signal) });
  if (query.isPending) return <LoadingState label="正在加载账号信息…" />;
  if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const user = query.data;
  return <><header className="mb-7 flex items-end justify-between gap-5 max-[600px]:flex-col max-[600px]:items-start"><div><p className="mb-2 text-xs text-[#92928d]">工作空间 / 我的账号</p><h1 className="font-serif text-[28px] font-medium">我的账号</h1><p className="mt-2.5 text-[13px] text-[#868d80]">查看当前身份与可访问的业务范围。</p></div><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={15} className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} />刷新信息</Button></header><section className="rounded-[14px] border border-[#e7e7e3] bg-white p-7 max-[600px]:p-5"><div className="flex items-center gap-3.5 border-b border-[#eef0ea] pb-6"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e7ebe5] text-lg text-[#4d6554]">{user.name.slice(0, 1)}</span><div><h2 className="text-lg font-medium">{user.name}</h2><p className="mt-1.5 text-xs text-[#92998b]">{roleLabels[user.role]} · {user.account}</p></div><span className="ml-auto rounded-md bg-[#edf3e8] px-2.5 py-1.5 text-[11px] text-[#618255]">{user.status === 'ACTIVE' ? '使用中' : '已停用'}</span></div><dl className="grid grid-cols-2 gap-6 px-0 py-5 max-[600px]:grid-cols-1 max-[600px]:gap-[18px] [&_dd]:mt-2 [&_dd]:text-sm [&_dt]:text-xs [&_dt]:text-[#8d9685]"><div><dt>账号</dt><dd>{user.account}</dd></div><div><dt>角色</dt><dd>{roleLabels[user.role]}</dd></div><div><dt>所属门店</dt><dd>油漆门店</dd></div><div><dt>当前环境</dt><dd>{isMock ? '本地模拟环境' : '正式接口'}</dd></div></dl><div className="flex items-start gap-3 rounded-[10px] bg-[#f6f8f3] p-5 text-[#718863] [&_h3]:mb-2.5 [&_h3]:text-[13px] [&_h3]:font-medium [&_p]:text-xs [&_p]:leading-5 [&_p]:text-[#66795a] [&_small]:mt-2.5 [&_small]:block [&_small]:text-[11px] [&_small]:leading-5 [&_small]:text-[#8e9b83]"><ShieldCheck className="shrink-0" size={22} /><div><h3>访问权限</h3><p>{descriptions[user.role]}</p><small>业务功能开放后，将按你的权限显示入口。修改账号权限请联系门店管理员。</small></div></div></section></>;
}
