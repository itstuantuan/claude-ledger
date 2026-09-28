import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentPageSchema, paymentSchema } from '../src/features/finance/schema';
import { createApiClient } from '../src/lib/api/client';

const payment = {
  id: 'pay-1', transactionNo: 'SK202609280001', workerId: 'w-1', workerName: '测试客户',
  amount: '10.00', paymentMethod: 'CASH', occurredAt: '2026-09-28T00:00:00Z',
  note: '', operatorName: '测试操作人', createdAt: '2026-09-28T00:00:00Z',
  receivableBefore: '20.00', receivableAfter: '10.00', unallocatedAmount: '10.00',
};

test('payment list accepts null allocations from older API responses', async () => {
  const api = createApiClient({
    baseUrl: '/api/v1',
    fetcher: async () => Response.json({
      items: [{ ...payment, allocations: null }], page: 1, pageSize: 20, total: 1,
    }),
  });
  const page = await api.request('/payments', paymentPageSchema);
  assert.deepEqual(page.items[0].allocations, []);
  assert.equal(page.items[0].unallocatedAmount, '10.00');
});

test('payment allocations preserve valid entries and reject malformed values', () => {
  for (const allocations of [undefined, null, []]) {
    assert.deepEqual(paymentSchema.parse({ ...payment, allocations }).allocations, []);
  }
  const allocations = [{ orderId: 'order-1', orderNo: 'YL001', amount: '10.00' }];
  assert.deepEqual(paymentSchema.parse({ ...payment, allocations }).allocations, allocations);
  for (const invalid of ['', {}, [{ orderId: 'order-1' }]]) {
    assert.equal(paymentSchema.safeParse({ ...payment, allocations: invalid }).success, false);
  }
});
