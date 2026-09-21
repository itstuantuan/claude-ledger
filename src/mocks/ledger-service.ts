import { NextRequest, NextResponse } from 'next/server';
import type { LedgerEntry, LedgerStatement } from '@/features/ledger/schema';
import { fromMinorUnits, toMinorUnits } from '@/lib/utils/money';
import { authenticateMock, mockFail } from './auth-service';
import { findMockWorker } from './customer-service';
import { listMockOrders } from './order-service';
import { listMockPayments, listMockReturns } from './finance-service';

type RawEntry = Omit<LedgerEntry, 'balance'>;

const storeDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});

function dayKey(value: string) {
  return storeDate.format(new Date(value));
}

function inRange(date: string, from: string | null, to: string | null) {
  const day = dayKey(date);
  return (!from || day >= from) && (!to || day <= to);
}

function movement(entry: RawEntry) {
  return toMinorUnits(entry.chargeAmount) - toMinorUnits(entry.paymentAmount) - toMinorUnits(entry.prepaidAmount) - toMinorUnits(entry.returnAmount);
}

export function buildMockStatement(workerId: string, from: string | null, to: string | null): LedgerStatement | null {
  const worker = findMockWorker(workerId);
  if (!worker) return null;
  const entries: RawEntry[] = [
    ...listMockOrders().filter((item) => item.workerId === workerId).map((item): RawEntry => ({
      id: `order:${item.id}`, type: 'ORDER', referenceNo: item.orderNo, occurredAt: item.occurredAt,
      description: item.projectName ? `项目用料 · ${item.projectName}` : '客户用料',
      chargeAmount: item.finalAmount, paymentAmount: item.paymentAmount, prepaidAmount: item.prepaidDeduction,
      returnAmount: '0.00', operatorName: item.operatorName,
    })),
    ...listMockPayments().filter((item) => item.workerId === workerId).map((item): RawEntry => ({
      id: `payment:${item.id}`, type: 'PAYMENT', referenceNo: item.transactionNo, occurredAt: item.occurredAt,
      description: item.note || '客户收款', chargeAmount: '0.00', paymentAmount: item.amount,
      prepaidAmount: '0.00', returnAmount: '0.00', operatorName: item.operatorName,
    })),
    ...listMockReturns().filter((item) => item.workerId === workerId && item.status === 'CONFIRMED').map((item): RawEntry => ({
      id: `return:${item.id}`, type: 'RETURN', referenceNo: item.returnNo, occurredAt: item.occurredAt,
      description: `退料 · 原单 ${item.orderNo}`, chargeAmount: '0.00', paymentAmount: '0.00',
      prepaidAmount: '0.00', returnAmount: item.receivableReduction, operatorName: item.operatorName,
    })),
  ].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
  const current = toMinorUnits(worker.receivable);
  const baseline = current - entries.reduce((total, entry) => total + movement(entry), 0n);
  const opening = entries.filter((entry) => Boolean(from) && dayKey(entry.occurredAt) < from!).reduce((total, entry) => total + movement(entry), baseline);
  const selected = entries.filter((entry) => inRange(entry.occurredAt, from, to));
  let balance = opening;
  const statementEntries = selected.map((entry): LedgerEntry => {
    balance += movement(entry);
    return { ...entry, balance: fromMinorUnits(balance) };
  });
  const total = (field: keyof Pick<RawEntry, 'chargeAmount' | 'paymentAmount' | 'prepaidAmount' | 'returnAmount'>) =>
    fromMinorUnits(selected.reduce((sum, entry) => sum + toMinorUnits(entry[field]), 0n));
  return {
    worker: { id: worker.id, name: worker.name, phone: worker.phone, teamName: worker.teamName },
    from, to, generatedAt: new Date().toISOString(),
    summary: {
      openingBalance: fromMinorUnits(opening), chargeTotal: total('chargeAmount'), paymentTotal: total('paymentAmount'),
      prepaidTotal: total('prepaidAmount'), returnTotal: total('returnAmount'), closingBalance: fromMinorUnits(balance),
    },
    entries: statementEntries,
  };
}

export async function handleMockLedger(request: NextRequest) {
  const user = authenticateMock(request);
  if (!user) return mockFail(401, 'UNAUTHENTICATED', '请先登录。');
  if (!user.permissions.includes('reconciliation:read')) return mockFail(403, 'FORBIDDEN', '你没有查看往来账和对账单的权限。');
  if (request.method !== 'GET') return mockFail(405, 'METHOD_NOT_ALLOWED', '请求方法不支持。');
  const workerId = request.nextUrl.searchParams.get('workerId');
  if (!workerId) return mockFail(422, 'WORKER_REQUIRED', '请选择油漆工。');
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) || (from && to && from > to)) {
    return mockFail(422, 'INVALID_DATE_RANGE', '对账日期范围不正确。');
  }
  const statement = buildMockStatement(workerId, from, to);
  return statement ? NextResponse.json(statement, { headers: { 'Cache-Control': 'no-store' } }) : mockFail(404, 'WORKER_NOT_FOUND', '油漆工不存在。');
}
