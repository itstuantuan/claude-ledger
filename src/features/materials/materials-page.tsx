'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, Pagination, SearchBox, StatusBadge } from '@/components/business/customer-ui';
import { ErrorState, LoadingState } from '@/components/common/error-state';
import { PermissionGate } from '@/components/common/permission-gate';
import { materialsApi } from '@/lib/api/materials';
import { errorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/utils/money';
import { materialInputSchema, type Material, type MaterialInput } from './schema';

const selectClass='h-10 shrink-0 rounded-lg border border-black/15 bg-white px-3 text-xs text-[#52514e]';
const fieldClass='grid grid-cols-2 gap-3 max-[600px]:grid-cols-1 [&_label>span]:mb-2 [&_label>span]:block [&_label>span]:text-xs [&_label>span]:text-[#66645f]';

function MaterialForm({open,onOpenChange,value}:{open:boolean;onOpenChange:(value:boolean)=>void;value?:Material}) {
  const client=useQueryClient();
  const form=useForm<MaterialInput>({resolver:zodResolver(materialInputSchema),defaultValues:{name:'',category:'',brand:'',specification:'',unit:'桶',defaultPrice:'',costPrice:'',status:'ACTIVE'}});
  useEffect(()=>{if(open)form.reset(value?{name:value.name,category:value.category,brand:value.brand,specification:value.specification,unit:value.unit,defaultPrice:value.defaultPrice,costPrice:value.costPrice,status:value.status,version:value.version}:{name:'',category:'',brand:'',specification:'',unit:'桶',defaultPrice:'',costPrice:'',status:'ACTIVE'});},[open,value,form]);
  const mutation=useMutation({mutationFn:(input:MaterialInput)=>value?materialsApi.update(value.id,input):materialsApi.create(input),onSuccess:async()=>{await client.invalidateQueries({queryKey:['materials']});toast.success(value?'材料已更新':'材料已新增');onOpenChange(false);},onError:(error)=>form.setError('root',{message:errorMessage(error)})});
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[calc(100svh-32px)] max-w-[680px] flex-col overflow-hidden p-0">
      <div className="shrink-0 px-[26px] pb-5 pt-[26px]">
        <DialogTitle className="mr-8 font-serif text-[23px] font-medium">{value?'编辑材料':'新增材料'}</DialogTitle>
        <DialogDescription className="mt-2 text-[13px] text-[#787d75]">已产生业务数据的材料只能停用，历史记录会继续保留。</DialogDescription>
      </div>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(x=>mutation.mutate(x))}>
        <div className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-5">
          <div className={fieldClass}><label><span>材料名称 *</span><Input {...form.register('name')}/>{form.formState.errors.name&&<small className="text-[#a34e40]">{form.formState.errors.name.message}</small>}</label><label><span>分类 *</span><Input placeholder="例如：内墙漆" {...form.register('category')}/></label><label><span>品牌 *</span><Input placeholder="例如：多乐士" {...form.register('brand')}/></label><label><span>规格 *</span><Input placeholder="例如：18L" {...form.register('specification')}/></label><label><span>单位 *</span><Input placeholder="桶 / 袋 / 卷" {...form.register('unit')}/></label><label><span>状态</span><select className="h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm" {...form.register('status')}><option value="ACTIVE">正常</option><option value="DISABLED">已停用</option></select></label><label><span>默认售价 *</span><Input inputMode="decimal" placeholder="0.00" {...form.register('defaultPrice')}/>{form.formState.errors.defaultPrice&&<small className="text-[#a34e40]">{form.formState.errors.defaultPrice.message}</small>}</label><label><span>成本价 *</span><Input inputMode="decimal" placeholder="0.00" {...form.register('costPrice')}/>{form.formState.errors.costPrice&&<small className="text-[#a34e40]">{form.formState.errors.costPrice.message}</small>}</label></div>
          {form.formState.errors.root&&<p className="mt-4 text-xs text-[#a34e40]">{form.formState.errors.root.message}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-[#e7e7e3] bg-[#fcfcfb] px-[26px] py-4">
          <Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>取消</Button>
          <Button disabled={mutation.isPending}>{mutation.isPending?'正在保存…':'保存材料'}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}

export function MaterialsPage() {
  const router=useRouter(),pathname=usePathname(),params=useSearchParams(),client=useQueryClient();
  const [open,setOpen]=useState(false);const [editing,setEditing]=useState<Material>();
  const set=(key:string,value:string)=>{const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);next.set('page','1');router.replace(`${pathname}?${next}`);};
  const query=useQuery({queryKey:['materials',params.toString()],queryFn:({signal})=>materialsApi.list({search:params.get('search'),brand:params.get('brand'),category:params.get('category'),status:params.get('status'),page:params.get('page')||1,pageSize:10},signal)});
  const options=useQuery({queryKey:['materials','options'],queryFn:({signal})=>materialsApi.list({pageSize:50},signal)});
  const disable=useMutation({mutationFn:(item:Material)=>materialsApi.update(item.id,{name:item.name,category:item.category,brand:item.brand,specification:item.specification,unit:item.unit,defaultPrice:item.defaultPrice,costPrice:item.costPrice,status:item.status==='ACTIVE'?'DISABLED':'ACTIVE',version:item.version}),onSuccess:async()=>{await client.invalidateQueries({queryKey:['materials']});toast.success('材料状态已更新');}});
  const page=Number(params.get('page'))||1;
  return <><header className="mb-7 flex items-end justify-between gap-5"><div><p className="mb-2 text-xs text-[#8a8985]">材料管理</p><h1 className="font-serif text-[28px] font-medium">材料</h1><p className="mt-2.5 text-[13px] text-[#77756e]">维护门店在售材料、默认售价与成本信息。</p></div><PermissionGate permission="materials:write"><Button onClick={()=>{setEditing(undefined);setOpen(true);}}><Plus size={16}/>新增材料</Button></PermissionGate></header>
  <form className="mb-4 flex flex-wrap items-center gap-2.5" onSubmit={e=>{e.preventDefault();set('search',String(new FormData(e.currentTarget).get('search')||''));}}><SearchBox defaultValue={params.get('search')||''} placeholder="搜索材料、品牌或规格"/><select className={selectClass} value={params.get('brand')||''} onChange={e=>set('brand',e.target.value)}><option value="">全部品牌</option>{[...new Set(options.data?.items.map(x=>x.brand)||[])].map(x=><option key={x}>{x}</option>)}</select><select className={selectClass} value={params.get('category')||''} onChange={e=>set('category',e.target.value)}><option value="">全部分类</option>{[...new Set(options.data?.items.map(x=>x.category)||[])].map(x=><option key={x}>{x}</option>)}</select><select className={selectClass} value={params.get('status')||''} onChange={e=>set('status',e.target.value)}><option value="">全部状态</option><option value="ACTIVE">正常</option><option value="DISABLED">已停用</option></select><Button variant="outline">搜索</Button></form>
  {query.isPending?<LoadingState label="正在加载材料…"/>:query.isError?<ErrorState error={query.error} retry={()=>void query.refetch()}/>:<section className="overflow-hidden rounded-[14px] border border-black/10 bg-white">{query.data.items.length?<div className="overflow-auto"><table className="w-full min-w-[950px] border-collapse text-xs [&_th]:border-b [&_th]:border-black/10 [&_th]:bg-[#fafaf8] [&_th]:px-3.5 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-[#77756e] [&_td]:border-b [&_td]:border-black/5 [&_td]:px-3.5 [&_td]:py-3.5"><thead><tr><th>材料</th><th>分类</th><th>品牌</th><th>规格</th><th>单位</th><th>默认售价</th><th>成本价</th><th>状态</th><th/></tr></thead><tbody>{query.data.items.map(item=><tr className="hover:bg-[#fafaf8]" key={item.id}><td><strong className="font-medium text-[#22211f]">{item.name}</strong></td><td>{item.category}</td><td>{item.brand}</td><td>{item.specification}</td><td>{item.unit}</td><td className="tabular-nums">{formatMoney(item.defaultPrice)}</td><td className="tabular-nums text-[#77756e]">{formatMoney(item.costPrice)}</td><td><StatusBadge status={item.status}/></td><td><PermissionGate permission="materials:write"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="编辑材料" onClick={()=>{setEditing(item);setOpen(true);}}><Edit3 size={14}/></Button><Button variant="ghost" onClick={()=>disable.mutate(item)}>{item.status==='ACTIVE'?'停用':'启用'}</Button></div></PermissionGate></td></tr>)}</tbody></table></div>:<EmptyState title="暂无材料" description="新增第一项门店材料。"/>}<Pagination page={page} pageSize={query.data.pageSize} total={query.data.total} href={next=>{const value=new URLSearchParams(params);value.set('page',String(next));return `${pathname}?${value}`;}}/></section>}
  <MaterialForm open={open} onOpenChange={setOpen} value={editing}/></>;
}
