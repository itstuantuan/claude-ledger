import { NextRequest, NextResponse } from 'next/server';
import type { DashboardData } from '@/features/dashboard/schema';
import { fromMinorUnits, toMinorUnits } from '@/lib/utils/money';
import { authenticateMock, mockFail } from './auth-service';
import { listMockProjects, listMockWorkers } from './customer-service';
import { listMockOrders } from './order-service';
import { listMockPayments, listMockReturns } from './finance-service';

const seedTrend = [
  ['2026-04','32400.00','26900.00'],['2026-05','41800.00','35200.00'],['2026-06','38600.00','31800.00'],
  ['2026-07','52700.00','43100.00'],['2026-08','61400.00','48600.00'],['2026-09','58800.00','47200.00'],
] as const;
const sum = (values:string[]) => fromMinorUnits(values.reduce((total,value)=>total+toMinorUnits(value),0n));

export function buildMockDashboard(): DashboardData {
  const workers=listMockWorkers(),orders=listMockOrders(),payments=listMockPayments(),returns=listMockReturns();
  const trend=new Map<string,{month:string;materialAmount:bigint;paymentAmount:bigint}>(seedTrend.map(([month,materialAmount,paymentAmount])=>[month,{month,materialAmount:toMinorUnits(materialAmount),paymentAmount:toMinorUnits(paymentAmount)}]));
  for(const item of orders){const month=item.occurredAt.slice(0,7);const row=trend.get(month)||{month,materialAmount:0n,paymentAmount:0n};row.materialAmount+=toMinorUnits(item.finalAmount);row.paymentAmount+=toMinorUnits(item.paymentAmount);trend.set(month,row);}
  for(const item of payments){const month=item.occurredAt.slice(0,7);const row=trend.get(month)||{month,materialAmount:0n,paymentAmount:0n};row.paymentAmount+=toMinorUnits(item.amount);trend.set(month,row);}
  const recent=[
    ...orders.map(item=>({id:`order:${item.id}`,type:'ORDER' as const,referenceNo:item.orderNo,workerName:item.workerName,amount:item.finalAmount,occurredAt:item.occurredAt})),
    ...payments.map(item=>({id:`payment:${item.id}`,type:'PAYMENT' as const,referenceNo:item.transactionNo,workerName:item.workerName,amount:item.amount,occurredAt:item.occurredAt})),
    ...returns.map(item=>({id:`return:${item.id}`,type:'RETURN' as const,referenceNo:item.returnNo,workerName:item.workerName,amount:item.amount,occurredAt:item.occurredAt})),
  ].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,6);
  return {generatedAt:new Date().toISOString(),summary:{materialTotal:sum(workers.map(item=>item.materialTotal)),paymentTotal:sum(workers.map(item=>item.paymentTotal)),returnTotal:sum(workers.map(item=>item.returnTotal)),receivable:sum(workers.map(item=>item.receivable)),activeWorkers:workers.filter(item=>item.status==='ACTIVE').length,activeProjects:listMockProjects().filter(item=>item.status==='ACTIVE').length},trend:[...trend.values()].sort((a,b)=>a.month.localeCompare(b.month)).slice(-6).map(item=>({...item,materialAmount:fromMinorUnits(item.materialAmount),paymentAmount:fromMinorUnits(item.paymentAmount)})),topDebtors:[...workers].filter(item=>toMinorUnits(item.receivable)>0n).sort((a,b)=>Number(toMinorUnits(b.receivable)-toMinorUnits(a.receivable))).slice(0,5).map(item=>({workerId:item.id,workerName:item.name,teamName:item.teamName,receivable:item.receivable})),recent};
}

export async function handleMockDashboard(request:NextRequest){const user=authenticateMock(request);if(!user)return mockFail(401,'UNAUTHENTICATED','请先登录。');if(!user.permissions.includes('reports:read'))return mockFail(403,'FORBIDDEN','你没有查看经营统计的权限。');if(request.method!=='GET')return mockFail(405,'METHOD_NOT_ALLOWED','请求方法不支持。');return NextResponse.json(buildMockDashboard(),{headers:{'Cache-Control':'no-store'}});}
