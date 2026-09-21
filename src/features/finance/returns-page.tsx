'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, Pagination, SearchBox } from '@/components/business/customer-ui';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { PermissionGate } from '@/components/common/permission-gate';
import { returnsApi } from '@/lib/api/finance';
import { ordersApi } from '@/lib/api/orders';
import { errorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/utils/money';
import type { ReturnInput } from './schema';

const fieldClass='grid gap-4 [&_label>span]:mb-2 [&_label>span]:block [&_label>span]:text-xs [&_label>span]:text-[#66645f]';
const tableClass='w-full min-w-[1080px] border-collapse text-xs [&_th]:border-b [&_th]:border-black/10 [&_th]:bg-[#fafaf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#77756e] [&_td]:border-b [&_td]:border-black/5 [&_td]:px-4 [&_td]:py-3.5';
const localToday=()=>{const date=new Date();date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,10);};

export function ReturnsPage(){
  const router=useRouter(),pathname=usePathname(),params=useSearchParams(),page=Number(params.get('page'))||1;
  const [open,setOpen]=useState(false);
  const [orderId,setOrderId]=useState('');
  const [occurredAt,setOccurredAt]=useState(localToday);
  const [quantities,setQuantities]=useState<Record<string,string>>({});
  const [note,setNote]=useState('');
  const client=useQueryClient();
  const setDate=(key:'from'|'to',value:string)=>{const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);next.set('page','1');router.replace(`${pathname}?${next}`);};
  const query=useQuery({queryKey:['returns',params.toString()],queryFn:({signal})=>returnsApi.list({search:params.get('search'),page,pageSize:20,from:params.get('from'),to:params.get('to')},signal)});
  const orders=useQuery({queryKey:['orders','return-options'],queryFn:({signal})=>ordersApi.list({pageSize:50},signal)});
  const order=orders.data?.items.find((item)=>item.id===orderId);
  const resetForm=()=>{setOrderId('');setOccurredAt(localToday());setQuantities({});setNote('');};
  const mutation=useMutation({
    mutationFn:(input:ReturnInput)=>returnsApi.create(input,crypto.randomUUID()),
    onSuccess:async(item)=>{toast.success(item.status==='PENDING'?'退料申请已提交':'退料已确认');setOpen(false);resetForm();await Promise.all([client.invalidateQueries({queryKey:['returns']}),client.invalidateQueries({queryKey:['workers']}),client.invalidateQueries({queryKey:['orders']})]);},
    onError:(error)=>toast.error(errorMessage(error)),
  });
  const submit=()=>{if(!order)return;const items=Object.entries(quantities).filter(([,quantity])=>Number(quantity)>0).map(([materialId,quantity])=>({materialId,quantity}));mutation.mutate({orderId:order.id,occurredAt,items,note});};

  return <>
    <header className="mb-7 flex items-end justify-between gap-5"><div><p className="mb-2 text-xs text-[#8a8985]">业务管理</p><h1 className="font-serif text-[28px] font-medium">退料记录</h1><p className="mt-2.5 text-[13px] text-[#77756e]">从原用料单选择材料退回，系统自动校验可退数量。</p></div><PermissionGate permission="returns:request"><Button onClick={()=>setOpen(true)}><RotateCcw size={15}/>发起退料</Button></PermissionGate></header>

    <form className="mb-4 flex flex-wrap items-end gap-2.5" onSubmit={event=>{event.preventDefault();const next=new URLSearchParams(params);const search=String(new FormData(event.currentTarget).get('search')||'');if(search)next.set('search',search);else next.delete('search');next.set('page','1');router.replace(`${pathname}?${next}`);}}>
      <SearchBox defaultValue={params.get('search')||''} placeholder="搜索退料单、原用料单或油漆工"/>
      <label className="grid gap-1 text-[11px] text-[#77756e]"><span>开始日期</span><input className="h-10 rounded-lg border border-black/15 bg-white px-3 text-xs text-[#22211f]" type="date" value={params.get('from')||''} max={params.get('to')||undefined} onChange={event=>setDate('from',event.target.value)}/></label>
      <label className="grid gap-1 text-[11px] text-[#77756e]"><span>结束日期</span><input className="h-10 rounded-lg border border-black/15 bg-white px-3 text-xs text-[#22211f]" type="date" value={params.get('to')||''} min={params.get('from')||undefined} onChange={event=>setDate('to',event.target.value)}/></label>
      <Button variant="outline">搜索</Button>
      {(params.get('from')||params.get('to'))&&<Button type="button" variant="ghost" onClick={()=>{const next=new URLSearchParams(params);next.delete('from');next.delete('to');next.set('page','1');router.replace(`${pathname}?${next}`);}}>清除日期</Button>}
    </form>

    {query.isPending?<LoadingState label="正在加载退料记录…"/>:query.isError?<ErrorState error={query.error} retry={()=>void query.refetch()}/>:<section className="overflow-hidden rounded-[14px] border border-black/10 bg-white"><div className="overflow-auto">{query.data.items.length?<table className={tableClass}><thead><tr><th>退料日期</th><th>退料单</th><th>原用料单</th><th>油漆工</th><th>退料内容</th><th>退料金额</th><th>冲减应收</th><th>状态</th><th>操作人</th></tr></thead><tbody>{query.data.items.map((item)=><tr className="hover:bg-[#fafaf8]" key={item.id}><td className="whitespace-nowrap font-medium tabular-nums text-[#22211f]">{new Date(item.occurredAt).toLocaleDateString('zh-CN')}</td><td className="font-medium text-[#22211f]">{item.returnNo}</td><td>{item.orderNo}</td><td>{item.workerName}</td><td>{item.items.map((line)=>`${line.materialName} × ${line.quantity}`).join('、')}</td><td className="tabular-nums">{formatMoney(item.amount)}</td><td className="tabular-nums text-[#558063]">{formatMoney(item.receivableReduction)}</td><td><span className="rounded-md bg-[#efeeeb] px-2 py-1 text-[10px]">{item.status==='PENDING'?'待确认':item.status==='CONFIRMED'?'已确认':'已冲销'}</span></td><td>{item.operatorName}</td></tr>)}</tbody></table>:<EmptyState title="暂无退料记录" description="从原用料单发起退料后会显示在这里。"/>}</div><Pagination page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} href={next=>{const value=new URLSearchParams(params);value.set('page',String(next));return `${pathname}?${value}`;}}/></section>}

    <Dialog open={open} onOpenChange={(value)=>{setOpen(value);if(!value)resetForm();}}><DialogContent className="max-w-[680px]"><DialogTitle>从原用料单发起退料</DialogTitle><DialogDescription>退料数量不能超过原购买数量减去历史已退数量。</DialogDescription><div className={fieldClass}>
      <label><span>退料日期 *</span><Input type="date" value={occurredAt} onChange={event=>setOccurredAt(event.target.value)}/></label>
      <label><span>原用料单 *</span><select className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm" value={orderId} onChange={(event)=>{setOrderId(event.target.value);setQuantities({});}}><option value="">请选择原用料单</option>{orders.data?.items.map((item)=><option value={item.id} key={item.id}>{new Date(item.occurredAt).toLocaleDateString('zh-CN')} · {item.orderNo} · {item.workerName} · {formatMoney(item.finalAmount)}</option>)}</select></label>
      {order&&<div className="overflow-hidden rounded-xl border border-black/10"><div className="grid grid-cols-[1fr_90px_120px] bg-[#fafaf8] px-4 py-2.5 text-xs text-[#77756e]"><span>材料</span><span>原数量</span><span>本次退料</span></div>{order.items.map((item)=><div className="grid grid-cols-[1fr_90px_120px] items-center border-t border-black/5 px-4 py-3 text-xs" key={item.materialId}><span><strong className="block font-medium">{item.materialName}</strong><small className="mt-1 block text-[#8a8985]">{item.specification} · {formatMoney(item.unitPrice)}/{item.unit}</small></span><span>{item.quantity} {item.unit}</span><Input className="h-8" inputMode="decimal" placeholder="0" value={quantities[item.materialId]||''} onChange={(event)=>setQuantities((value)=>({...value,[item.materialId]:event.target.value}))}/></div>)}</div>}
      <label><span>备注</span><Input value={note} onChange={(event)=>setNote(event.target.value)} placeholder="退料原因，选填"/></label>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setOpen(false)}>取消</Button><Button disabled={!order||!occurredAt||mutation.isPending||!Object.values(quantities).some((value)=>Number(value)>0)} onClick={submit}>{mutation.isPending?'正在提交…':'确认退料'}</Button></div>
    </div></DialogContent></Dialog>
  </>;
}
