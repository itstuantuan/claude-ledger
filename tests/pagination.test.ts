import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPages } from '../src/lib/api/pagination';

test('collects all materials using the page size returned by the API', async () => {
  const calls: number[] = [];
  const result = await collectPages(async (page) => {
    calls.push(page);
    return { items: page === 1 ? ['a', 'b'] : ['c'], page, pageSize: 2, total: 3 };
  });
  assert.deepEqual(result, ['a', 'b', 'c']);
  assert.deepEqual(calls, [1, 2]);
});

test('empty catalog completes without requesting another page', async () => {
  assert.deepEqual(await collectPages(async (page) => ({ items: [], page, pageSize: 50, total: 0 })), []);
});

test('later page errors are surfaced instead of showing an incomplete catalog', async () => {
  await assert.rejects(collectPages(async (page) => {
    if (page === 2) throw new Error('network failed');
    return { items: ['a'], page, pageSize: 1, total: 2 };
  }), /network failed/);
});

test('inconsistent empty pages do not loop indefinitely', async () => {
  await assert.rejects(collectPages(async (page) => ({ items: [], page, pageSize: 50, total: 100 })), /分页异常/);
});
