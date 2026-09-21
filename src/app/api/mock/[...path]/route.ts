import type { NextRequest } from 'next/server';
import { handleMockAuth } from '@/mocks/auth-service';
import { handleMockCustomers } from '@/mocks/customer-service';
import { handleMockMaterials } from '@/mocks/material-service';
import { handleMockOrders } from '@/mocks/order-service';
import { handleMockFinance } from '@/mocks/finance-service';
import { handleMockLedger } from '@/mocks/ledger-service';
import { handleMockDashboard } from '@/mocks/dashboard-service';
export const runtime = 'nodejs';
async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path;
  if (path[0] === 'auth') return handleMockAuth(request, path);
  if (path[0] === 'materials' || path[0] === 'pricing') return handleMockMaterials(request, path);
  if (path[0] === 'orders') return handleMockOrders(request);
  if (path[0] === 'payments' || path[0] === 'prepaid' || path[0] === 'returns') return handleMockFinance(request, path[0]);
  if (path[0] === 'ledger' && path[1] === 'statement') return handleMockLedger(request);
  if (path[0] === 'dashboard' && path[1] === 'summary') return handleMockDashboard(request);
  return handleMockCustomers(request, path);
}
export { handler as GET, handler as POST, handler as PATCH };
