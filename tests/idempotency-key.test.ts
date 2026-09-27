import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdempotencyKey } from '../src/lib/utils/idempotency-key';

test('uses browser randomUUID when available', () => {
  const source = { randomUUID: () => 'native-uuid', getRandomValues: () => { throw new Error('unused'); } } as unknown as Crypto;
  assert.equal(createIdempotencyKey(source), 'native-uuid');
});

test('creates a valid UUID v4 when randomUUID is unavailable on HTTP', () => {
  const source = { getRandomValues: (bytes: Uint8Array) => { bytes.fill(0xff); return bytes; } } as unknown as Crypto;
  assert.equal(createIdempotencyKey(source), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
});
