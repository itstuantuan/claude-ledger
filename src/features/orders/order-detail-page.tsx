'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { ordersApi } from '@/lib/api/orders';
import { formatMoney, fromMinorUnits, toMinorUnits } from '@/lib/utils/money';
import type { Order, OrderStatus, PaymentMethod } from './schema';

const statusLabels:Record<OrderStatus,string>={DRAFT:'草稿',CONFIRMED:'已确认',PARTIALLY_PAID:'部分付款',PAID:'已付清',REVERSED:'已冲销'};
const paymentLabels:Record<PaymentMethod,string>={WECHAT:'微信',ALIPAY:'支付宝',CASH:'现金',BANK_CARD:'银行卡',OTHER:'其他'};
const panel='rounded-[14px] border border-black/10 bg-white';

export function OrderDetailPage({id}:{id:string}){
  const client=useQueryClient();
  const cached=client.getQueriesData<{items:Order[]}>({queryKey:['orders']}).flatMap(([,page])=>page?.items||[]).find((order)=>order.id===id);
  const query=useQuery({queryKey:['orders',id],queryFn:({signal})=>ordersApi.get(id,signal),initialData:cached});
  if(query.isPending)return <LoadingState label="正在加载用料单…"/>;
  if(query.isError)return <ErrorState error={query.error} retry={()=>void query.refetch()}/>;
  const order=query.data;
  const net=fromMinorUnits(toMinorUnits(order.finalAmount)-toMinorUnits(order.returnedAmount));
  return <article className="print-order-detail">
    <Link className="print-hide mb-5 inline-flex items-center gap-1.5 text-xs text-[#77756e] hover:text-[#22211f]" href="/orders"><ArrowLeft size={15}/>返回用料记录</Link>
    <header className="order-detail-header mb-6 flex items-end justify-between gap-4 max-[600px]:items-start"><div><p className="mb-2 text-xs text-[#8a8985]">业务管理 / 用料单详情</p><div className="flex flex-wrap items-center gap-3"><h1 className="font-serif text-[28px] font-medium">{order.orderNo}</h1><span className="rounded-md bg-[#efeeeb] px-2.5 py-1 text-[11px]">{statusLabels[order.status]}</span></div><p className="mt-2 text-xs text-[#77756e]">业务日期 {new Date(order.occurredAt).toLocaleString('zh-CN')} · 经办人 {order.operatorName}</p></div><Button className="print-hide" variant="outline" onClick={()=>window.print()}><Printer size={15}/>打印 / 导出</Button></header>
    <section className="order-detail-summary mb-4 grid grid-cols-5 gap-2.5 max-[1100px]:grid-cols-3 max-[600px]:grid-cols-2">
      {[['原用料金额',formatMoney(order.finalAmount),''],['退料金额',`- ${formatMoney(order.returnedAmount)}`,'text-[#558063]'],['净用料金额',formatMoney(net),''],['已结金额',formatMoney(order.settledAmount),'text-[#558063]'],['未结金额',formatMoney(order.outstandingAmount),'text-[#a34e40]']].map(([label,value,tone])=><article className={`${panel} p-4`} key={label}><span className="text-[11px] text-[#77756e]">{label}</span><strong className={`mt-4 block text-lg font-medium tabular-nums ${tone}`}>{value}</strong></article>)}
    </section>
    <section className={`${panel} order-detail-items mb-4 overflow-hidden`}><div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-black/10 px-5 py-4 text-xs"><span className="text-[#77756e]">油漆工 <Link className="ml-1 font-medium text-[#22211f] hover:underline" href={`/workers/${order.workerId}`}>{order.workerName}</Link></span><span className="text-[#77756e]">工地 <b className="ml-1 font-medium text-[#22211f]">{order.projectName||'未指定'}</b></span><span className="text-[#77756e]">材料 <b className="ml-1 font-medium text-[#22211f]">{order.items.length} 项</b></span></div><div className="order-detail-table-wrap overflow-auto"><table className="order-detail-table w-full min-w-[780px] border-collapse text-xs [&_th]:border-b [&_th]:border-black/10 [&_th]:bg-[#fafaf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#77756e] [&_td]:border-b [&_td]:border-black/5 [&_td]:px-4 [&_td]:py-3.5"><thead><tr><th>材料</th><th>规格</th><th>单价</th><th>数量</th><th>单位</th><th>优惠</th><th>小计</th></tr></thead><tbody>{order.items.map(item=><tr key={item.materialId}><td className="font-medium text-[#22211f]">{item.materialName}</td><td>{item.specification}</td><td className="tabular-nums">{formatMoney(item.unitPrice)}</td><td className="tabular-nums">{item.quantity}</td><td>{item.unit}</td><td className="tabular-nums">-{formatMoney(item.discount)}</td><td className="font-medium tabular-nums">{formatMoney(item.subtotal)}</td></tr>)}</tbody></table></div></section>
    <div className="order-detail-meta grid grid-cols-2 gap-4 max-[800px]:grid-cols-1"><section className={`${panel} p-5`}><h2 className="mb-4 text-sm font-medium">结算信息</h2><dl className="grid gap-3 text-xs [&>div]:flex [&>div]:justify-between"><div><dt className="text-[#77756e]">付款方式</dt><dd>{order.paymentMethod?paymentLabels[order.paymentMethod]:'记账 / 未付款'}</dd></div><div><dt className="text-[#77756e]">本次付款</dt><dd className="tabular-nums">{formatMoney(order.paymentAmount)}</dd></div><div><dt className="text-[#77756e]">预存抵扣</dt><dd className="tabular-nums">{formatMoney(order.prepaidDeduction)}</dd></div><div><dt className="text-[#77756e]">新增应收</dt><dd className="font-medium tabular-nums text-[#a34e40]">{formatMoney(order.addedReceivable)}</dd></div></dl></section><section className={`${panel} p-5`}><h2 className="mb-4 text-sm font-medium">单据信息</h2><dl className="grid gap-3 text-xs [&>div]:flex [&>div]:justify-between"><div><dt className="text-[#77756e]">创建时间</dt><dd>{new Date(order.createdAt).toLocaleString('zh-CN')}</dd></div><div><dt className="text-[#77756e]">经办人</dt><dd>{order.operatorName}</dd></div><div><dt className="text-[#77756e]">备注</dt><dd className="max-w-[70%] text-right">{order.note||'无'}</dd></div></dl></section></div>
  </article>;
}
