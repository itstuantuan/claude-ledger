import test from 'node:test';
import assert from 'node:assert/strict';
import { toMinorUnits, fromMinorUnits, formatMoney } from '../src/lib/utils/money';
import { can, safeReturnTo } from '../src/lib/auth/permissions';
import { loginSchema, type User } from '../src/features/auth/schema';
test('money arithmetic is exact and retains values beyond JS safe integer', () => {
  assert.equal(fromMinorUnits(toMinorUnits('0.1') + toMinorUnits('0.2')), '0.30');
  assert.equal(formatMoney('999999999999999999.99'), '¥999,999,999,999,999,999.99');
  assert.equal(formatMoney('-1234.5'), '-¥1,234.50');
  for (const invalid of ['NaN', '1e3', '0.001', '1,000', '']) assert.throws(() => toMinorUnits(invalid));
});
test('permissions require active identity and explicit grant', () => {
  const user: User = { id: '1', name: '店员', account: 'clerk', status: 'ACTIVE', role: 'CLERK', permissions: ['workers:read', 'orders:create'] };
  assert.equal(can(user, 'orders:create'), true); assert.equal(can(user, 'payments:create'), false);
  assert.equal(can({ ...user, status: 'DISABLED' }, 'orders:create'), false); assert.equal(can(null, 'workers:read'), false);
});
test('login redirect cannot navigate to external or unapproved pages', () => {
  assert.equal(safeReturnTo('/account'), '/account');
  assert.equal(safeReturnTo('/orders/create'), '/orders/create');
  for (const value of ['//evil.test', 'https://evil.test', '/\\evil.test', '/admin', 'javascript:alert(1)']) assert.equal(safeReturnTo(value), '/dashboard');
});
test('login schema validates required fields without trimming passwords', () => {
  assert.equal(loginSchema.safeParse({ account: '', password: '' }).success, false);
  assert.deepEqual(loginSchema.parse({ account: ' owner ', password: ' pwd ' }), { account: 'owner', password: ' pwd ' });
});
