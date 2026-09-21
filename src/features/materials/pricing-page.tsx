'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { PermissionGate } from '@/components/common/permission-gate';
import { pricingApi } from '@/lib/api/materials';
import { workersApi } from '@/lib/api/customers';
import { formatMoney } from '@/lib/utils/money';
import { errorMessage } from '@/lib/api/errors';

export function PricingPage() {
  const client = useQueryClient();
  const workers = useQuery({ queryKey: ['workers', 'pricing-options'], queryFn: ({ signal }) => workersApi.list({ pageSize: 50, status: 'ACTIVE' }, signal) });
  const [workerId, setWorkerId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const selectedWorkerId = workerId || workers.data?.items[0]?.id || '';
  const pricing = useQuery({ queryKey: ['pricing', selectedWorkerId], queryFn: ({ signal }) => pricingApi.list(selectedWorkerId, signal), enabled: !!selectedWorkerId });
  const priceValue = (materialId: string, original: string | null) => values[materialId] ?? original ?? '';
  const save = useMutation({
    mutationFn: () => pricingApi.save({
      workerId: selectedWorkerId,
      prices: (pricing.data || []).map((item) => ({ materialId: item.materialId, price: priceValue(item.materialId, item.customerPrice).trim() || null })),
    }),
    onSuccess: async () => {
      setValues({});
      await client.invalidateQueries({ queryKey: ['pricing', selectedWorkerId] });
      toast.success('客户专属价格已保存');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const worker = workers.data?.items.find((item) => item.id === selectedWorkerId);

  return <>
    <header className="mb-7 flex items-end justify-between gap-5 max-[600px]:flex-col max-[600px]:items-start">
      <div><p className="mb-2 text-xs text-[#8a8985]">材料管理</p><h1 className="font-serif text-[28px] font-medium">客户价格</h1><p className="mt-2.5 text-[13px] text-[#77756e]">本次手工价优先，其次使用客户专属价格，最后使用材料默认售价。</p></div>
      <PermissionGate permission="materials:write"><Button disabled={!selectedWorkerId || save.isPending} onClick={() => save.mutate()}><Save size={15} />{save.isPending ? '正在保存…' : '保存价格'}</Button></PermissionGate>
    </header>
    <section className="mb-4 flex flex-wrap items-center gap-4 rounded-[14px] border border-black/10 bg-[#fcfcfb] p-5">
      <label className="min-w-[280px] flex-1"><span className="mb-2 block text-xs text-[#66645f]">选择油漆工</span><select className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm" value={selectedWorkerId} onChange={(event) => { setWorkerId(event.target.value); setValues({}); }}><option value="">请选择油漆工</option>{workers.data?.items.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.phone}</option>)}</select></label>
      {worker && <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-[#77756e]"><span>施工队</span><strong className="font-medium text-[#22211f]">{worker.teamName || '独立油漆工'}</strong><span>当前欠款</span><strong className="font-medium tabular-nums text-[#22211f]">{formatMoney(worker.receivable)}</strong></div>}
    </section>
    {!selectedWorkerId ? <div className="grid min-h-60 place-items-center text-sm text-[#8a8985]">请选择油漆工后设置价格</div> : pricing.isPending ? <LoadingState label="正在加载客户价格…" /> : pricing.isError ? <ErrorState error={pricing.error} retry={() => void pricing.refetch()} /> :
      <section className="overflow-hidden rounded-[14px] border border-black/10 bg-white"><div className="overflow-auto"><table className="w-full min-w-[760px] border-collapse text-xs [&_th]:border-b [&_th]:border-black/10 [&_th]:bg-[#fafaf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#77756e] [&_td]:border-b [&_td]:border-black/5 [&_td]:px-4 [&_td]:py-3"><thead><tr><th>材料</th><th>品牌 / 规格</th><th>默认售价</th><th className="w-[220px]">客户价格</th><th>差价</th><th>当前生效价</th></tr></thead><tbody>{pricing.data?.map((item) => {
        const value = priceValue(item.materialId, item.customerPrice);
        const difference = value ? Number(value) - Number(item.defaultPrice) : 0;
        return <tr key={item.materialId}><td><strong className="font-medium text-[#22211f]">{item.materialName}</strong></td><td className="text-[#77756e]">{item.brand} · {item.specification} / {item.unit}</td><td className="tabular-nums">{formatMoney(item.defaultPrice)}</td><td><PermissionGate permission="materials:write" fallback={<span className="tabular-nums">{item.customerPrice ? formatMoney(item.customerPrice) : '使用默认售价'}</span>}><Input className="h-9" inputMode="decimal" aria-label={`${item.materialName}客户价格`} placeholder={item.defaultPrice} value={value} onChange={(event) => setValues((current) => ({ ...current, [item.materialId]: event.target.value }))} /></PermissionGate></td><td className="tabular-nums text-[#77756e]">{value ? `${difference > 0 ? '+' : ''}¥${difference.toFixed(2)}` : '—'}</td><td className="font-medium tabular-nums text-[#22211f]">{formatMoney(value || item.defaultPrice)}</td></tr>;
      })}</tbody></table></div><div className="border-t border-black/10 px-4 py-3 text-[11px] text-[#8a8985]">留空表示使用材料默认售价。专属价格只影响该油漆工的新用料单。</div></section>}
  </>;
}
