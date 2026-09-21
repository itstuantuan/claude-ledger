'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBox, EmptyState, Pagination } from '@/components/business/customer-ui';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { PermissionGate } from '@/components/common/permission-gate';
import { ordersApi } from '@/lib/api/orders';
import { workersApi } from '@/lib/api/customers';
import { formatMoney } from '@/lib/utils/money';

const statusLabels={DRAFT:'草稿',CONFIRMED:'已确认',PARTIALLY_PAID:'部分付款',PAID:'已付清',REVERSED:'已冲销'};
export function OrdersPage() {
  const router=useRouter(),pathname=usePathname(),params=useSearchParams();
  const set=(key:string,value:string)=>{const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);next.set('page','1');router.replace(`${pathname}?${next}`);};
  const query=useQuery({queryKey:['orders',params.toString()],queryFn:({signal})=>ordersApi.list({search:params.get('search'),workerId:params.get('workerId'),status:params.get('status'),page:params.get('page')||1,pageSize:10},signal)});
  const workers=useQuery({queryKey:['workers','order-filter'],queryFn:({signal})=>workersApi.list({pageSize:50},signal)});
  const page=Number(params.get('page'))||1;
  return <><header className="mb-7 flex items-end justify-between gap-5"><div><p className="mb-2 text-xs text-[#8a8985]">业务管理</p><h1 className="font-serif text-[28px] font-medium">用料记录</h1><p className="mt-2.5 text-[13px] text-[#77756e]">查看已提交的客户用料单及结算状态。</p></div><PermissionGate permission="orders:create"><Button asChild><Link href="/orders/create"><Plus size={16}/>开用料单</Link></Button></PermissionGate></header>
  <form className="mb-4 flex flex-wrap items-center gap-2.5" onSubmit={event=>{event.preventDefault();set('search',String(new FormData(event.currentTarget).get('search')||''));}}><SearchBox defaultValue={params.get('search')||''} placeholder="搜索单号、油漆工或工地"/><select className="h-10 rounded-lg border border-black/15 bg-white px-3 text-xs" value={params.get('workerId')||''} onChange={event=>set('workerId',event.target.value)}><option value="">全部油漆工</option>{workers.data?.items.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select><select className="h-10 rounded-lg border border-black/15 bg-white px-3 text-xs" value={params.get('status')||''} onChange={event=>set('status',event.target.value)}><option value="">全部状态</option>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><Button variant="outline">搜索</Button></form>
  {query.isPending?<LoadingState label="正在加载用料记录…"/>:query.isError?<ErrorState error={query.error} retry={()=>void query.refetch()}/>:<section className="overflow-hidden rounded-[14px] border border-black/10 bg-white">{query.data.items.length?<div className="overflow-auto"><table className="w-full min-w-[980px] border-collapse text-xs [&_th]:border-b [&_th]:border-black/10 [&_th]:bg-[#fafaf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#77756e] [&_td]:border-b [&_td]:border-black/5 [&_td]:px-4 [&_td]:py-3.5"><thead><tr><th>单号 / 时间</th><th>油漆工</th><th>工地</th><th>材料</th><th>用料金额</th><th>付款</th><th>新增欠款</th><th>状态</th><th>操作人</th></tr></thead><tbody>{query.data.items.map(item=><tr className="hover:bg-[#fafaf8]" key={item.id}><td><strong className="block font-medium text-[#22211f]">{item.orderNo}</strong><small className="mt-1 block text-[10px] text-[#8a8985]">{new Date(item.createdAt).toLocaleString('zh-CN')}</small></td><td>{item.workerName}</td><td>{item.projectName||'未指定'}</td><td>{item.items.length} 项</td><td className="font-medium tabular-nums">{formatMoney(item.finalAmount)}</td><td className="tabular-nums">{formatMoney(item.paymentAmount)}</td><td className="tabular-nums text-[#a34e40]">{formatMoney(item.addedReceivable)}</td><td><span className="rounded-md bg-[#efeeeb] px-2 py-1 text-[10px]">{statusLabels[item.status]}</span></td><td>{item.operatorName}</td></tr>)}</tbody></table></div>:<EmptyState title="暂无用料记录" description="创建第一张用料单后会显示在这里。"/>}<Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} href={next=>{const value=new URLSearchParams(params);value.set('page',String(next));return `${pathname}?${value}`;}}/></section>}</>;
}
