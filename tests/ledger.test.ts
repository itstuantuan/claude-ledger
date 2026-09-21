import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerStatementSchema } from '../src/features/ledger/schema';
import { buildMockStatement } from '../src/mocks/ledger-service';

test('seeded receivable is preserved as the opening and closing balance before new activity', () => {
  const statement = buildMockStatement('w-1', null, null);
  assert.ok(statement);
  assert.equal(statement.summary.openingBalance, '9800.00');
  assert.equal(statement.summary.closingBalance, '9800.00');
  assert.equal(statement.summary.chargeTotal, '0.00');
  assert.deepEqual(statement.entries, []);
  assert.equal(ledgerStatementSchema.safeParse(statement).success, true);
});

test('statement builder rejects an unknown worker', () => {
  assert.equal(buildMockStatement('missing-worker', '2026-09-01', '2026-09-30'), null);
});
