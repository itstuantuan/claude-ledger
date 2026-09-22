import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateMock, mockFail } from './auth-service';
import { findMockProject, findMockWorker, updateMockWorkerFinancials } from './customer-service';
import { findMockMaterial } from './material-service';
import { orderInputSchema, type Order, type OrderStatus } from '@/features/orders/schema';
import { fromMinorUnits, toMinorUnits } from '@/lib/utils/money';

type MockOrderState={orders:Order[];submitted:Map<string,Order>};
const mockGlobal=globalThis as typeof globalThis&{__paintOrderState?:MockOrderState};
const mockState=mockGlobal.__paintOrderState??={orders:[],submitted:new Map<string,Order>()};
const {orders,submitted}=mockState;
const storeDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
export function listMockOrders(){return orders;}
export function findMockOrder(id:string){return orders.find((item)=>item.id===id);}
function dayKey(value:string){return storeDate.format(new Date(value));}

function replaceOrder(next:Order){const index=orders.findIndex((item)=>item.id===next.id);if(index>=0)orders[index]=next;for(const [key,item] of submitted)if(item.id===next.id)submitted.set(key,next);return next;}
function nextStatus(order:Order,outstanding:bigint,returned=toMinorUnits(order.returnedAmount)):OrderStatus {
  if(returned>=toMinorUnits(order.finalAmount))return 'REVERSED';
  if(outstanding===0n)return 'PAID';
  return toMinorUnits(order.settledAmount)>0n?'PARTIALLY_PAID':'CONFIRMED';
}
export function applyMockOrderReturn(orderId:string,amount:bigint,receivableLimit:bigint){
  const order=findMockOrder(orderId);if(!order)return 0n;
  const outstanding=toMinorUnits(order.outstandingAmount);
  const reduction=amount<outstanding?(amount<receivableLimit?amount:receivableLimit):(outstanding<receivableLimit?outstanding:receivableLimit);
  const returned=toMinorUnits(order.returnedAmount)+amount;
  const nextOutstanding=outstanding-reduction;
  replaceOrder({...order,returnedAmount:fromMinorUnits(returned),outstandingAmount:fromMinorUnits(nextOutstanding),status:returned>=toMinorUnits(order.finalAmount)?'REVERSED':nextStatus(order,nextOutstanding,returned)});
  return reduction;
}
export function applyMockWorkerPayment(workerId:string,amount:bigint){
  let remaining=amount;
  const candidates=orders.filter((item)=>item.workerId===workerId&&toMinorUnits(item.outstandingAmount)>0n).sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt));
  for(const order of candidates){if(remaining===0n)break;const outstanding=toMinorUnits(order.outstandingAmount);const applied=remaining<outstanding?remaining:outstanding;remaining-=applied;const nextOutstanding=outstanding-applied;const settled=toMinorUnits(order.settledAmount)+applied;replaceOrder({...order,settledAmount:fromMinorUnits(settled),outstandingAmount:fromMinorUnits(nextOutstanding),status:nextStatus({...order,settledAmount:fromMinorUnits(settled)},nextOutstanding)});}
  return amount-remaining;
}

function quantityMilli(value:string) {
  const [whole,fraction='']=value.split('.');
  return BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'));
}
function lineSubtotal(price:string,quantity:string,discount:string) {
  const gross=(toMinorUnits(price)*quantityMilli(quantity)+500n)/1000n;
  return gross-toMinorUnits(discount);
}
function page<T>(items:T[],request:NextRequest) {
  const current=Math.max(1,Number(request.nextUrl.searchParams.get('page'))||1);
  const size=Math.min(50,Math.max(1,Number(request.nextUrl.searchParams.get('pageSize'))||10));
  return {items:items.slice((current-1)*size,current*size),page:current,pageSize:size,total:items.length};
}

export async function handleMockOrders(request:NextRequest,path:string[]=['orders']) {
  const user=authenticateMock(request);if(!user)return mockFail(401,'UNAUTHENTICATED','请先登录。');
  if(request.method==='GET') {
    if(!user.permissions.includes('workers:read'))return mockFail(403,'FORBIDDEN','你没有查看用料记录的权限。');
    if(path[1]){const order=findMockOrder(path[1]);return order?NextResponse.json(order):mockFail(404,'ORDER_NOT_FOUND','用料单不存在。');}
    const search=(request.nextUrl.searchParams.get('search')||'').toLowerCase();
    const workerId=request.nextUrl.searchParams.get('workerId');
    const status=request.nextUrl.searchParams.get('status') as OrderStatus|null;
    const from=request.nextUrl.searchParams.get('from');
    const to=request.nextUrl.searchParams.get('to');
    let items=[...orders];
    if(search)items=items.filter(x=>`${x.orderNo}${x.workerName}${x.projectName||''}`.toLowerCase().includes(search));
    if(workerId)items=items.filter(x=>x.workerId===workerId);
    if(status)items=items.filter(x=>x.status===status);
    if(from)items=items.filter(x=>dayKey(x.occurredAt)>=from);
    if(to)items=items.filter(x=>dayKey(x.occurredAt)<=to);
    return NextResponse.json(page(items,request));
  }
  if(request.method!=='POST')return mockFail(405,'METHOD_NOT_ALLOWED','请求方法不支持。');
  if(!user.permissions.includes('orders:create'))return mockFail(403,'FORBIDDEN','你没有创建用料单的权限。');
  const key=request.headers.get('idempotency-key');
  if(!key)return mockFail(422,'IDEMPOTENCY_REQUIRED','缺少防重复提交标识。');
  const previous=submitted.get(key);if(previous)return NextResponse.json(previous);
  const parsed=orderInputSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return mockFail(422,'VALIDATION_ERROR','请检查用料单内容。',parsed.error.flatten().fieldErrors);
  const worker=findMockWorker(parsed.data.workerId);if(!worker)return mockFail(404,'WORKER_NOT_FOUND','油漆工不存在。');
  const project=parsed.data.projectId?findMockProject(parsed.data.projectId):undefined;
  if(parsed.data.projectId&&!project)return mockFail(404,'PROJECT_NOT_FOUND','工地项目不存在。');
  let goods=0n,discount=0n;
  const items=[];
  for(const input of parsed.data.items) {
    const material=findMockMaterial(input.materialId);if(!material||material.status!=='ACTIVE')return mockFail(422,'MATERIAL_UNAVAILABLE','所选材料不存在或已停用。');
    const lineDiscount=toMinorUnits(input.discount);const gross=(toMinorUnits(input.unitPrice)*quantityMilli(input.quantity)+500n)/1000n;
    if(lineDiscount>gross)return mockFail(422,'DISCOUNT_EXCEEDED',`${material.name}的优惠不能超过商品金额。`);
    goods+=gross;discount+=lineDiscount;
    items.push({materialId:material.id,materialName:material.name,specification:material.specification,unit:material.unit,quantity:input.quantity,unitPrice:input.unitPrice,discount:input.discount,subtotal:fromMinorUnits(lineSubtotal(input.unitPrice,input.quantity,input.discount))});
  }
  const finalAmount=goods-discount,payment=toMinorUnits(parsed.data.paymentAmount),prepaid=toMinorUnits(parsed.data.prepaidDeduction);
  if(prepaid>toMinorUnits(worker.prepaidBalance))return mockFail(422,'PREPAID_EXCEEDED','预存抵扣超过当前预存余额。');
  if(payment+prepaid>finalAmount)return mockFail(422,'SETTLEMENT_EXCEEDED','付款和预存抵扣不能超过应收金额。');
  const debt=finalAmount-payment-prepaid;
  const now=new Date();const serial=String(orders.length+1).padStart(4,'0');
  const occurredAt=new Date(parsed.data.occurredAt).toISOString();
  const order:Order={id:`o-${randomUUID()}`,orderNo:`YL${now.toISOString().slice(0,10).replaceAll('-','')}${serial}`,workerId:worker.id,workerName:worker.name,projectId:project?.id||null,projectName:project?.name||parsed.data.projectName||null,items,goodsAmount:fromMinorUnits(goods),discountAmount:fromMinorUnits(discount),finalAmount:fromMinorUnits(finalAmount),paymentAmount:fromMinorUnits(payment),prepaidDeduction:fromMinorUnits(prepaid),addedReceivable:fromMinorUnits(debt),returnedAmount:'0.00',settledAmount:fromMinorUnits(payment+prepaid),outstandingAmount:fromMinorUnits(debt),paymentMethod:parsed.data.paymentMethod,status:debt===0n?'PAID':payment+prepaid>0n?'PARTIALLY_PAID':'CONFIRMED',note:parsed.data.note,occurredAt,createdAt:now.toISOString(),operatorName:user.name};
  orders.unshift(order);submitted.set(key,order);updateMockWorkerFinancials(worker.id,{materialTotal:finalAmount,paymentTotal:payment,prepaidBalance:-prepaid,receivable:debt,occurredAt});
  return NextResponse.json(order,{status:201});
}
