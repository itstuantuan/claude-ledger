import test from 'node:test';
import assert from 'node:assert/strict';
import { formatStoreDate, formatStoreDateTime, storeDateTimeInput, toApiDateTime } from '../src/lib/utils/datetime';

test('store date display is fixed to Asia/Shanghai', () => {
  assert.equal(formatStoreDate('2026-09-27T17:30:00Z'), '2026-09-28');
  assert.equal(formatStoreDateTime('2026-09-27T17:30:00Z'), '2026-09-28 01:30');
  assert.equal(storeDateTimeInput('2026-09-27T17:30:00Z'), '2026-09-28T01:30');
});

test('datetime-local input is serialized as RFC3339 UTC using store timezone', () => {
  assert.equal(toApiDateTime('2026-09-28T12:30'), '2026-09-28T04:30:00.000Z');
  assert.equal(toApiDateTime('2026-09-28'), '2026-09-27T16:00:00.000Z');
  assert.equal(toApiDateTime('2026-09-28T04:30:00Z'), '2026-09-28T04:30:00.000Z');
});
