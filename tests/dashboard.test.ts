import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardSchema } from '../src/features/dashboard/schema';
import { buildMockDashboard } from '../src/mocks/dashboard-service';
import { toMinorUnits } from '../src/lib/utils/money';

test('dashboard summary matches current worker balances and has ordered trend data', () => {
  const dashboard = buildMockDashboard();
  assert.equal(dashboardSchema.safeParse(dashboard).success, true);
  assert.equal(dashboard.summary.activeWorkers, 10);
  assert.equal(dashboard.summary.activeProjects, 2);
  assert.equal(dashboard.trend.length, 6);
  assert.deepEqual(dashboard.trend.map((item) => item.month), [...dashboard.trend.map((item) => item.month)].sort());
  assert.ok(toMinorUnits(dashboard.summary.receivable) > 0n);
});

test('dashboard debtor ranking is descending and limited to five customers', () => {
  const items = buildMockDashboard().topDebtors;
  assert.ok(items.length <= 5);
  for (let index = 1; index < items.length; index++) assert.ok(toMinorUnits(items[index - 1].receivable) >= toMinorUnits(items[index].receivable));
});
