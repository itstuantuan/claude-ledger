'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { PermissionGate } from '@/components/common/permission-gate';
import { pricingApi } from '@/lib/api/materials';
import { workersApi } from '@/lib/api/customers';
import { formatMoney } from '@/lib/utils/money';
import { formatStoreDateTime } from '@/lib/utils/datetime';
import { createIdempotencyKey } from '@/lib/utils/idempotency-key';
import { errorMessage } from '@/lib/api/errors';

const validPrice = /^\d+(?:\.\d{1,2})?$/;

export function PricingPage() {
  const client = useQueryClient();
  const workers = useQuery({ queryKey: ['workers', 'pricing-options'], queryFn: ({ signal }) => workersApi.list({ pageSize: 100, status: 'ACTIVE' }, signal) });
  const [workerId, setWorkerId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [customOnly, setCustomOnly] = useState(false);
  const selectedWorkerId = workerId || workers.data?.items[0]?.id || '';
  const pricing = useQuery({ queryKey: ['pricing', selectedWorkerId], queryFn: ({ signal }) => pricingApi.list(selectedWorkerId, {}, signal), enabled: !!selectedWorkerId });
  const priceValue = (materialId: string, original: string | null) => values[materialId] ?? original ?? '';
  const changes = useMemo(() => (pricing.data || []).flatMap((item) => {
    if (!(item.materialId in values)) return [];
    const raw = values[item.materialId].trim();
    const original = item.customerPrice ?? '';
    if (raw === original) return [];
    return [{ materialId: item.materialId, price: raw || null, expectedVersion: item.priceVersion }];
  }), [pricing.data, values]);
  const invalid = changes.some((item) => item.price !== null && !validPrice.test(item.price));
  const needle = search.trim().toLowerCase();
  const visible = (pricing.data || []).filter((item) => (!customOnly || priceValue(item.materialId, item.customerPrice) !== '') && (!needle || `${item.materialName}${item.brand}${item.specification}`.toLowerCase().includes(needle)));
  const save = useMutation({
    mutationFn: () => pricingApi.save({ workerId: selectedWorkerId, prices: changes }, createIdempotencyKey()),
    onSuccess: async (items) => {
      client.setQueryData(['pricing', selectedWorkerId], items);
      setValues({});
      toast.success(`已保存 ${changes.length} 项客户价格`);
    },
    onError: async (error) => {
      toast.error(errorMessage(error));
      await client.invalidateQueries({ queryKey: ['pricing', selectedWorkerId] });
    },
  });
  const changeWorker = (next: string) => {
    if (changes.length && !window.confirm('当前价格尚未保存，确定放弃这些修改吗？')) return;
    setWorkerId(next); setValues({}); setSearch('');
  };
  const worker = workers.data?.items.find((item) => item.id === selectedWorkerId);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (changes.length) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler);
  }, [changes.length]);

  return <>
    <header className="mb-7 flex items-end justify-between gap-5 max-[600px]:flex-col max-[600px]:items-start">
      <div><p className="mb-2 text-xs text-[#8a8985]">材料管理</p><h1 className="font-serif text-[28px] font-medium">客户价格</h1><p className="mt-2.5 text-[13px] text-[#77756e]">为客户设置专属材料价；开单和补料会按业务时间自动采用当时有效的价格。</p></div>
      <PermissionGate permission="materials:write"><Button disabled={!selectedWorkerId || !changes.length || invalid || save.isPending} onClick={() => save.mutate()}><Save size={15} />{save.isPending ? '正在保存…' : changes.length ? `保存 ${changes.length} 项` : '没有待保存修改'}</Button></PermissionGate>
    </header>
    <section className="mb-4 flex flex-wrap items-end gap-4 rounded-[14px] border border-black/10 bg-[#fcfcfb] p-5">
      <label className="min-w-[280px] flex-1"><span className="mb-2 block text-xs text-[#66645f]">选择油漆工</span><select className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm" value={selectedWorkerId} onChange={(event) => changeWorker(event.target.value)}><option value="">请选择油漆工</option>{workers.data?.items.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.phone}</option>)}</select></label>
      <label className="relative min-w-[240px] flex-1"><span className="mb-2 block text-xs text-[#66645f]">搜索材料</span><Search className="absolute bottom-3 left-3 text-[#8a8985]" size={15}/><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="材料名 / 品牌 / 规格" /></label>
      <label className="flex h-10 items-center gap-2 text-xs text-[#66645f]"><input type="checkbox" checked={customOnly} onChange={(event) => setCustomOnly(event.target.checked)}/>只看专属价</label>
      {worker && <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-[#77756e]"><span>施工队</span><strong className="font-medium text-[#22211f]">{worker.teamName || '独立油漆工'}</strong><span>当前欠款</span><strong className="font-medium tabular-nums text-[#22211f]">{formatMoney(worker.receivable)}</strong></div>}
    </section>
    {!selectedWorkerId ? <div className="grid min-h-60 place-items-center text-sm text-[#8a8985]">请选择油漆工后设置价格</div> : pricing.isPending ? <LoadingState label="正在加载客户价格…" /> : pricing.isError ? <ErrorState error={pricing.error} retry={() => void pricing.refetch()} /> :
      <section className="overflow-hidden rounded-[14px] border border-black/10 bg-white"><div className="overflow-auto"><table className="w-full min-w-[900px] border-collapse text-xs [&_th]:border-b [&_th]:border-black/10 [&_th]:bg-[#fafaf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#77756e] [&_td]:border-b [&_td]:border-black/5 [&_td]:px-4 [&_td]:py-3"><thead><tr><th>材料</th><th>品牌 / 规格</th><th>默认售价</th><th className="w-[210px]">客户价格</th><th>差价</th><th>当前生效价</th><th>生效时间</th></tr></thead><tbody>{visible.map((item) => {
        const value = priceValue(item.materialId, item.customerPrice);
        const difference = value && validPrice.test(value) ? Number(value) - Number(item.defaultPrice) : 0;
        const changed = item.materialId in values && value.trim() !== (item.customerPrice ?? '');
        return <tr className={changed ? 'bg-[#fff9e9]' : ''} key={item.materialId}><td><strong className="font-medium text-[#22211f]">{item.materialName}</strong>{changed && <small className="ml-2 text-[#9a6b22]">待保存</small>}</td><td className="text-[#77756e]">{item.brand} · {item.specification} / {item.unit}</td><td className="tabular-nums">{formatMoney(item.defaultPrice)}</td><td><PermissionGate permission="materials:write" fallback={<span className="tabular-nums">{item.customerPrice ? formatMoney(item.customerPrice) : '使用默认售价'}</span>}><Input className={`h-9 ${value && !validPrice.test(value) ? 'border-red-500' : ''}`} inputMode="decimal" aria-label={`${item.materialName}客户价格`} placeholder={item.defaultPrice} value={value} onChange={(event) => setValues((current) => ({ ...current, [item.materialId]: event.target.value }))} /></PermissionGate></td><td className="tabular-nums text-[#77756e]">{value && validPrice.test(value) ? `${difference > 0 ? '+' : ''}¥${difference.toFixed(2)}` : '—'}</td><td className="font-medium tabular-nums text-[#22211f]">{formatMoney(value && validPrice.test(value) ? value : item.defaultPrice)}</td><td className="text-[#77756e]">{item.effectiveFrom ? formatStoreDateTime(item.effectiveFrom) : '默认售价'}</td></tr>;
      })}</tbody></table>{!visible.length && <div className="grid min-h-40 place-items-center text-xs text-[#8a8985]">没有匹配的材料</div>}</div><div className="border-t border-black/10 px-4 py-3 text-[11px] text-[#8a8985]">留空表示恢复材料默认售价。已开单据保留原成交价；补录旧业务时间时会采用当时有效的客户价。</div></section>}
  </>;
}
