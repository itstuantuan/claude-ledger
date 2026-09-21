'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarRange, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/business/customer-ui';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { workersApi } from '@/lib/api/customers';
import { ledgerApi } from '@/lib/api/ledger';
import { formatMoney, fromMinorUnits, toMinorUnits } from '@/lib/utils/money';

const tableClass = 'w-full min-w-[980px] border-collapse text-xs [&_th]:border-b [&_th]:border-black/10 [&_th]:bg-[#fafaf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#77756e] [&_td]:border-b [&_td]:border-black/5 [&_td]:px-4 [&_td]:py-3.5';
const statClass = 'rounded-xl border border-black/10 bg-white p-4 [&_span]:text-[11px] [&_span]:text-[#77756e] [&_strong]:mt-2 [&_strong]:block [&_strong]:text-lg [&_strong]:font-medium';
const localDate = (date = new Date()) => { const value = new Date(date); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 10); };
const moneySum = (values: string[]) => fromMinorUnits(values.reduce((sum, value) => sum + toMinorUnits(value), 0n));

export function LedgerPage() {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['workers', 'ledger'], queryFn: ({ signal }) => workersApi.list({ pageSize: 50 }, signal) });
  const items = useMemo(() => { const keyword = search.trim().toLowerCase(); return (query.data?.items || []).filter((item) => !keyword || `${item.name}${item.phone}${item.teamName || ''}`.toLowerCase().includes(keyword)); }, [query.data, search]);
  const totals = useMemo(() => ({ material: moneySum(items.map((item) => item.materialTotal)), returned: moneySum(items.map((item) => item.returnTotal)), paid: moneySum(items.map((item) => item.paymentTotal)), receivable: moneySum(items.map((item) => item.receivable)) }), [items]);
  return <>
    <header className="flex items-start justify-between gap-5"><div><h1>往来账</h1><p>汇总每位油漆工的用料、退料、付款与当前应收。</p></div><Button asChild variant="outline"><Link href="/reconciliation"><FileText size={15}/>生成对账单</Link></Button></header>
    {query.isPending ? <LoadingState label="正在加载往来账…"/> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()}/> : <>
      <section className="mb-4 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[560px]:grid-cols-1"><div className={statClass}><span>累计用料</span><strong>{formatMoney(totals.material)}</strong></div><div className={statClass}><span>累计退料</span><strong>{formatMoney(totals.returned)}</strong></div><div className={statClass}><span>累计付款</span><strong>{formatMoney(totals.paid)}</strong></div><div className={statClass}><span>当前应收</span><strong className="text-[#a34e40]">{formatMoney(totals.receivable)}</strong></div></section>
      <section className="overflow-hidden border-y border-black/10"><div className="border-b border-black/10 p-3"><label className="flex h-10 w-[360px] max-w-full items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-[#8a8985]"><Search size={16}/><input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#11110f] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索油漆工、手机号或施工队"/></label></div><div className="overflow-auto">{items.length ? <table className={tableClass}><thead><tr><th>油漆工</th><th>施工队</th><th>累计用料</th><th>累计退料</th><th>累计付款</th><th>预存余额</th><th>当前应收</th><th>最近往来</th><th></th></tr></thead><tbody>{items.map((item) => <tr className="hover:bg-[#f7f7f5]" key={item.id}><td><strong className="block font-medium text-[#22211f]">{item.name}</strong><small className="mt-1 block text-[10px] text-[#8a8985]">{item.phone}</small></td><td>{item.teamName || '—'}</td><td>{formatMoney(item.materialTotal)}</td><td>{formatMoney(item.returnTotal)}</td><td>{formatMoney(item.paymentTotal)}</td><td>{formatMoney(item.prepaidBalance)}</td><td className="font-medium text-[#a34e40]">{formatMoney(item.receivable)}</td><td>{item.lastTransactionAt ? new Date(item.lastTransactionAt).toLocaleDateString('zh-CN') : '—'}</td><td><Link className="inline-flex items-center gap-1 text-[#4f6f57] hover:underline" href={`/reconciliation?workerId=${item.id}`}>对账<ArrowRight size={13}/></Link></td></tr>)}</tbody></table> : <EmptyState title="没有匹配的往来客户" description="请更换关键词后重试。"/>}</div></section>
    </>}
  </>;
}

export function ReconciliationPage() {
  const params = useSearchParams();
  const today = localDate(); const defaultFrom = `${today.slice(0, 8)}01`; const initialWorker = params.get('workerId') || '';
  const [workerId, setWorkerId] = useState(initialWorker); const [from, setFrom] = useState(params.get('from') || defaultFrom); const [to, setTo] = useState(params.get('to') || today);
  const [applied, setApplied] = useState({ workerId: initialWorker, from: params.get('from') || defaultFrom, to: params.get('to') || today });
  const workers = useQuery({ queryKey: ['workers', 'reconciliation'], queryFn: ({ signal }) => workersApi.list({ pageSize: 50 }, signal) });
  const statement = useQuery({ queryKey: ['ledger-statement', applied], queryFn: ({ signal }) => ledgerApi.statement(applied, signal), enabled: Boolean(applied.workerId) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!workerId || from > to) return; setApplied({ workerId, from, to }); window.history.replaceState(null, '', `/reconciliation?workerId=${encodeURIComponent(workerId)}&from=${from}&to=${to}`); };
  const data = statement.data; const labels = { ORDER: '用料单', PAYMENT: '收款', RETURN: '退料' } as const;
  return <>
    <header className="flex items-start justify-between gap-5"><div><h1>客户对账</h1><p>按客户和日期范围核对期初、发生额与期末应收。</p></div><Button asChild variant="outline"><Link href="/ledger">返回往来账</Link></Button></header>
    <form className="mb-4 grid grid-cols-[minmax(220px,1fr)_170px_170px_auto] items-end gap-3 rounded-xl border border-black/10 bg-[#fafaf8] p-4 max-[850px]:grid-cols-2 max-[520px]:grid-cols-1" onSubmit={submit}><label><span className="mb-2 block text-xs text-[#66645f]">油漆工</span><select className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm" value={workerId} onChange={(event) => setWorkerId(event.target.value)}><option value="">请选择油漆工</option>{workers.data?.items.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.phone}</option>)}</select></label><label><span className="mb-2 block text-xs text-[#66645f]">开始日期</span><Input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)}/></label><label><span className="mb-2 block text-xs text-[#66645f]">结束日期</span><Input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)}/></label><Button disabled={!workerId || !from || !to || from > to}><CalendarRange size={15}/>生成对账单</Button></form>
    {!applied.workerId ? <EmptyState title="请选择对账客户" description="选择油漆工和日期范围后生成对账单。"/> : statement.isPending ? <LoadingState label="正在生成对账单…"/> : statement.isError ? <ErrorState error={statement.error} retry={() => void statement.refetch()}/> : data && <>
      <section className="mb-4 rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-medium">{data.worker.name} · 往来对账单</h2><p className="mt-1.5 text-xs text-[#77756e]">{data.worker.phone}{data.worker.teamName ? ` · ${data.worker.teamName}` : ''}</p></div><div className="text-right text-[11px] text-[#77756e]"><p>对账期间：{data.from} 至 {data.to}</p><p className="mt-1">生成时间：{new Date(data.generatedAt).toLocaleString('zh-CN')}</p></div></div></section>
      <section className="mb-4 grid grid-cols-6 gap-3 max-[1100px]:grid-cols-3 max-[650px]:grid-cols-2"><div className={statClass}><span>期初应收</span><strong>{formatMoney(data.summary.openingBalance)}</strong></div><div className={statClass}><span>本期用料</span><strong>{formatMoney(data.summary.chargeTotal)}</strong></div><div className={statClass}><span>本期付款</span><strong>{formatMoney(data.summary.paymentTotal)}</strong></div><div className={statClass}><span>预存抵扣</span><strong>{formatMoney(data.summary.prepaidTotal)}</strong></div><div className={statClass}><span>退料冲减</span><strong>{formatMoney(data.summary.returnTotal)}</strong></div><div className={statClass}><span>期末应收</span><strong className="text-[#a34e40]">{formatMoney(data.summary.closingBalance)}</strong></div></section>
      <section className="overflow-hidden border-y border-black/10"><div className="overflow-auto">{data.entries.length ? <table className={tableClass}><thead><tr><th>日期 / 单号</th><th>类型</th><th>摘要</th><th>用料增加</th><th>付款</th><th>预存抵扣</th><th>退料冲减</th><th>应收余额</th><th>操作人</th></tr></thead><tbody>{data.entries.map((item) => <tr className="hover:bg-[#f7f7f5]" key={item.id}><td><strong className="block font-medium">{new Date(item.occurredAt).toLocaleDateString('zh-CN')}</strong><small className="mt-1 block text-[10px] text-[#8a8985]">{item.referenceNo}</small></td><td><span className="rounded-md bg-[#efeeeb] px-2 py-1 text-[10px]">{labels[item.type]}</span></td><td>{item.description}</td><td>{formatMoney(item.chargeAmount)}</td><td>{formatMoney(item.paymentAmount)}</td><td>{formatMoney(item.prepaidAmount)}</td><td>{formatMoney(item.returnAmount)}</td><td className="font-medium">{formatMoney(item.balance)}</td><td>{item.operatorName}</td></tr>)}</tbody></table> : <EmptyState title="本期没有往来明细" description="所选期间没有新增用料、收款或已确认退料，期末应收与期初一致。"/>}</div></section>
    </>}
  </>;
}
