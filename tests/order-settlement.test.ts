import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { sessionSchema } from '../src/features/auth/schema';
import { orderSchema } from '../src/features/orders/schema';
import { handleMockAuth } from '../src/mocks/auth-service';
import { handleMockFinance } from '../src/mocks/finance-service';
import { findMockOrder, handleMockOrders } from '../src/mocks/order-service';

process.env.NEXT_PUBLIC_API_MODE = 'mock';
process.env.ALLOW_LOCAL_MOCK_BUILD = 'true';

const origin='http://127.0.0.1:3001';
function request(path:string,method:string,token?:string,body?:unknown){
  const headers=new Headers({host:'127.0.0.1:3001',origin});
  if(token)headers.set('authorization',`Bearer ${token}`);
  if(body!==undefined)headers.set('content-type','application/json');
  if(method==='POST'&&path!=='auth/login')headers.set('idempotency-key',crypto.randomUUID());
  return new NextRequest(`http://localhost:3001/api/mock/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}

test('payments and confirmed returns update the original order settlement snapshot',async()=>{
  const login=await handleMockAuth(request('auth/login','POST',undefined,{account:'owner',password:'Paint123!'}),['auth','login']);
  const session=sessionSchema.parse(await login.json());
  const created=await handleMockOrders(request('orders','POST',session.accessToken,{
    workerId:'w-1',projectId:null,occurredAt:'2026-09-22',items:[{materialId:'m-8',quantity:'2',unitPrice:'18.00',discount:'0.00'}],paymentAmount:'0.00',prepaidDeduction:'0.00',paymentMethod:null,note:'联动测试',
  }));
  assert.equal(created.status,201);
  const order=orderSchema.parse(await created.json());
  assert.equal(order.outstandingAmount,'36.00');

  const payment=await handleMockFinance(request('payments','POST',session.accessToken,{workerId:'w-1',amount:'10.00',paymentMethod:'CASH',occurredAt:'2026-09-22',note:''}),'payments');
  assert.equal(payment.status,201);
  assert.equal(findMockOrder(order.id)?.settledAmount,'10.00');
  assert.equal(findMockOrder(order.id)?.outstandingAmount,'26.00');
  assert.equal(findMockOrder(order.id)?.status,'PARTIALLY_PAID');

  const returned=await handleMockFinance(request('returns','POST',session.accessToken,{orderId:order.id,occurredAt:'2026-09-22',items:[{materialId:'m-8',quantity:'1'}],note:''}),'returns');
  assert.equal(returned.status,201);
  assert.equal(findMockOrder(order.id)?.returnedAmount,'18.00');
  assert.equal(findMockOrder(order.id)?.outstandingAmount,'8.00');
  assert.equal(orderSchema.safeParse(findMockOrder(order.id)).success,true);
});
