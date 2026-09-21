import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateMock, mockFail } from './auth-service';
import { findMockWorker, updateMockWorkerFinancials } from './customer-service';
import { applyMockOrderReturn, applyMockWorkerPayment, findMockOrder } from './order-service';
import { paymentInputSchema, prepaidInputSchema, returnInputSchema, type Payment, type Prepaid, type ReturnRecord } from '@/features/finance/schema';
import { fromMinorUnits, toMinorUnits } from '@/lib/utils/money';

let payments:Payment[]=[];
let prepaid:Prepaid[]=[];
let returns:ReturnRecord[]=[];
const submitted=new Map<string,Payment|Prepaid|ReturnRecord>();
const returnedQuantity=new Map<string,bigint>();
const storeDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});

export function listMockPayments(){return [...payments];}
export function listMockPrepaid(){return [...prepaid];}
export function listMockReturns(){return [...returns];}

function page<T>(items:T[],request:NextRequest){const current=Math.max(1,Number(request.nextUrl.searchParams.get('page'))||1);const size=Math.min(50,Math.max(1,Number(request.nextUrl.searchParams.get('pageSize'))||10));return {items:items.slice((current-1)*size,current*size),page:current,pageSize:size,total:items.length};}
function quantityMilli(value:string){const [whole,fraction='']=value.split('.');return BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'));}
function filter<T extends {workerId:string;workerName:string;occurredAt:string;transactionNo?:string;returnNo?:string;orderNo?:string}>(items:T[],request:NextRequest){const q=request.nextUrl.searchParams;const search=(q.get('search')||'').toLowerCase();const workerId=q.get('workerId');const from=q.get('from');const to=q.get('to');let next=[...items];if(search)next=next.filter((item)=>`${item.workerName}${item.transactionNo||''}${item.returnNo||''}${item.orderNo||''}`.toLowerCase().includes(search));if(workerId)next=next.filter((item)=>item.workerId===workerId);if(from)next=next.filter((item)=>storeDate.format(new Date(item.occurredAt))>=from);if(to)next=next.filter((item)=>storeDate.format(new Date(item.occurredAt))<=to);return next;}
function serial(prefix:string,count:number){const date=new Date().toISOString().slice(0,10).replaceAll('-','');return `${prefix}${date}${String(count+1).padStart(4,'0')}`;}

export async function handleMockFinance(request:NextRequest,resource:string){
  const user=authenticateMock(request);if(!user)return mockFail(401,'UNAUTHENTICATED','请先登录。');
  if(request.method==='GET'){
    if(resource==='returns'){
      if(!user.permissions.includes('workers:read'))return mockFail(403,'FORBIDDEN','你没有查看退料记录的权限。');
      return NextResponse.json(page(filter(returns,request),request));
    }
    if(!user.permissions.includes('finance:read'))return mockFail(403,'FORBIDDEN','你没有查看财务记录的权限。');
    if(resource==='payments')return NextResponse.json(page(filter(payments,request),request));
    return NextResponse.json(page(filter(prepaid,request),request));
  }
  if(request.method!=='POST')return mockFail(405,'METHOD_NOT_ALLOWED','请求方法不支持。');
  const key=request.headers.get('idempotency-key');if(!key)return mockFail(422,'IDEMPOTENCY_REQUIRED','缺少防重复提交标识。');
  const existing=submitted.get(`${resource}:${key}`);if(existing)return NextResponse.json(existing);
  const now=new Date().toISOString();
  if(resource==='payments'){
    if(!user.permissions.includes('payments:create'))return mockFail(403,'FORBIDDEN','你没有登记收款的权限。');
    const parsed=paymentInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return mockFail(422,'VALIDATION_ERROR','请检查收款信息。',parsed.error.flatten().fieldErrors);
    const worker=findMockWorker(parsed.data.workerId);if(!worker)return mockFail(404,'WORKER_NOT_FOUND','油漆工不存在。');
    const amount=toMinorUnits(parsed.data.amount),before=toMinorUnits(worker.receivable);if(amount>before)return mockFail(422,'PAYMENT_EXCEEDED','收款金额不能超过当前应收。');
    const item:Payment={id:`pay-${randomUUID()}`,transactionNo:serial('SK',payments.length),workerId:worker.id,workerName:worker.name,amount:fromMinorUnits(amount),paymentMethod:parsed.data.paymentMethod,occurredAt:new Date(parsed.data.occurredAt).toISOString(),note:parsed.data.note,operatorName:user.name,createdAt:now,receivableBefore:fromMinorUnits(before),receivableAfter:fromMinorUnits(before-amount)};
    payments=[item,...payments];submitted.set(`${resource}:${key}`,item);applyMockWorkerPayment(worker.id,amount);updateMockWorkerFinancials(worker.id,{paymentTotal:amount,receivable:-amount,occurredAt:item.occurredAt});return NextResponse.json(item,{status:201});
  }
  if(resource==='prepaid'){
    if(!user.permissions.includes('prepaid:deposit'))return mockFail(403,'FORBIDDEN','你没有登记预存款的权限。');
    const parsed=prepaidInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return mockFail(422,'VALIDATION_ERROR','请检查预存信息。',parsed.error.flatten().fieldErrors);
    const worker=findMockWorker(parsed.data.workerId);if(!worker)return mockFail(404,'WORKER_NOT_FOUND','油漆工不存在。');
    const amount=toMinorUnits(parsed.data.amount),before=toMinorUnits(worker.prepaidBalance);
    const item:Prepaid={id:`pre-${randomUUID()}`,transactionNo:serial('YC',prepaid.length),workerId:worker.id,workerName:worker.name,amount:fromMinorUnits(amount),paymentMethod:parsed.data.paymentMethod,occurredAt:new Date(parsed.data.occurredAt).toISOString(),note:parsed.data.note,operatorName:user.name,createdAt:now,balanceBefore:fromMinorUnits(before),balanceAfter:fromMinorUnits(before+amount)};
    prepaid=[item,...prepaid];submitted.set(`${resource}:${key}`,item);updateMockWorkerFinancials(worker.id,{prepaidBalance:amount,occurredAt:item.occurredAt});return NextResponse.json(item,{status:201});
  }
  if(resource==='returns'){
    if(!user.permissions.includes('returns:request'))return mockFail(403,'FORBIDDEN','你没有创建退料申请的权限。');
    const parsed=returnInputSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return mockFail(422,'VALIDATION_ERROR','请检查退料信息。',parsed.error.flatten().fieldErrors);
    const order=findMockOrder(parsed.data.orderId);if(!order)return mockFail(404,'ORDER_NOT_FOUND','原用料单不存在。');
    let total=0n;const lines=[];
    for(const input of parsed.data.items){const line=order.items.find((item)=>item.materialId===input.materialId);if(!line)return mockFail(422,'ORDER_ITEM_NOT_FOUND','退料材料不属于原用料单。');const quantity=quantityMilli(input.quantity);const mapKey=`${order.id}:${input.materialId}`;const returned=returnedQuantity.get(mapKey)||0n;const purchased=quantityMilli(line.quantity);if(quantity+returned>purchased)return mockFail(422,'RETURN_QUANTITY_EXCEEDED',`${line.materialName}的退料数量超过可退数量。`);const amount=(toMinorUnits(line.subtotal)*quantity+purchased/2n)/purchased;total+=amount;lines.push({materialId:line.materialId,materialName:line.materialName,unit:line.unit,quantity:input.quantity,unitPrice:line.unitPrice,amount:fromMinorUnits(amount)});}
    const worker=findMockWorker(order.workerId);if(!worker)return mockFail(404,'WORKER_NOT_FOUND','油漆工不存在。');const confirmed=user.permissions.includes('returns:confirm');const reduction=confirmed?applyMockOrderReturn(order.id,total,toMinorUnits(worker.receivable)):0n;
    const occurredAt=new Date(parsed.data.occurredAt).toISOString();
    const item:ReturnRecord={id:`ret-${randomUUID()}`,returnNo:serial('TL',returns.length),orderId:order.id,orderNo:order.orderNo,workerId:order.workerId,workerName:order.workerName,items:lines,amount:fromMinorUnits(total),receivableReduction:fromMinorUnits(reduction),status:confirmed?'CONFIRMED':'PENDING',note:parsed.data.note,operatorName:user.name,occurredAt,createdAt:now};
    returns=[item,...returns];submitted.set(`${resource}:${key}`,item);if(confirmed){for(const input of parsed.data.items){const mapKey=`${order.id}:${input.materialId}`;returnedQuantity.set(mapKey,(returnedQuantity.get(mapKey)||0n)+quantityMilli(input.quantity));}updateMockWorkerFinancials(worker.id,{returnTotal:total,receivable:-reduction,occurredAt});}return NextResponse.json(item,{status:201});
  }
  return mockFail(404,'NOT_FOUND','接口不存在。');
}
