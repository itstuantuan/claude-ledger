import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createApiClient } from '../src/lib/api/client';
import { ApiError } from '../src/lib/api/errors';
const user = { id: '1', name: '老板', account: 'owner', role: 'OWNER', status: 'ACTIVE', permissions: [] };
const session = { accessToken: 'fresh', expiresIn: 60, user };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const unauthorized = () => json({ code: 'EXPIRED', message: '过期' }, 401);

test('parallel 401s share one refresh; the rotated token is attached to both retries', async () => {
  let refreshes = 0; let calls = 0;
  const api = createApiClient({ baseUrl: '/api', fetcher: async (url, init) => {
    if (String(url).endsWith('/auth/refresh')) { refreshes++; return json(session); }
    calls++;
    assert.equal(init?.credentials, 'include');
    return new Headers(init?.headers).get('Authorization') === 'Bearer fresh' ? json({ ok: true }) : unauthorized();
  } });
  api.setToken('expired');
  const responses = await Promise.all([api.request('/one', z.object({ ok: z.boolean() })), api.request('/two', z.object({ ok: z.boolean() }))]);
  assert.deepEqual(responses, [{ ok: true }, { ok: true }]); assert.equal(refreshes, 1); assert.equal(calls, 4);
});
test('a second 401 clears auth without a refresh loop', async () => {
  let refreshes = 0; let expired = 0;
  const api = createApiClient({ baseUrl: '/api', onUnauthorized: () => expired++, fetcher: async (url) => {
    if (String(url).endsWith('/auth/refresh')) { refreshes++; return json(session); }
    return unauthorized();
  } });
  await assert.rejects(api.request('/private', z.unknown()), (error) => error instanceof ApiError && error.status === 401);
  assert.equal(refreshes, 1); assert.equal(expired, 1);
});
test('failed refresh clears session and does not retry the original write', async () => {
  let expired = 0; let writes = 0;
  const api = createApiClient({ baseUrl: '/api', onUnauthorized: () => expired++, fetcher: async (url) => { if (!String(url).endsWith('refresh')) writes++; return unauthorized(); } });
  await assert.rejects(api.request('/payment', z.unknown(), { method: 'POST', body: { amount: '1.00' } }));
  assert.equal(writes, 1); assert.equal(expired, 1);
});
test('login failures do not trigger refresh', async () => {
  let calls = 0;
  const api = createApiClient({ baseUrl: '/api', fetcher: async () => { calls++; return unauthorized(); } });
  await assert.rejects(api.request('/auth/login', z.unknown(), { method: 'POST', auth: false }));
  assert.equal(calls, 1);
});
test('logout invalidation prevents an in-flight refresh from resurrecting the session', async () => {
  let resolve!: (response: Response) => void; let received = 0;
  const api = createApiClient({ baseUrl: '/api', onSession: () => received++, fetcher: async () => new Promise<Response>((done) => { resolve = done; }) });
  const pending = api.refresh(); api.clearSession(); resolve(json(session));
  await assert.rejects(pending, (error) => error instanceof ApiError && error.code === 'SESSION_ENDED');
  assert.equal(received, 0);
});
test('idempotency key and request body remain unchanged after token refresh', async () => {
  const attempts: Array<{ key: string | null; body: BodyInit | null | undefined }> = [];
  const api = createApiClient({ baseUrl: '/api', fetcher: async (url, init) => {
    if (String(url).endsWith('refresh')) return json(session);
    attempts.push({ key: new Headers(init?.headers).get('Idempotency-Key'), body: init?.body });
    return attempts.length === 1 ? unauthorized() : json({ id: 'order-1' });
  } });
  await api.request('/orders', z.object({ id: z.string() }), { method: 'POST', body: { amount: '0.30' }, idempotencyKey: 'same-key' });
  assert.deepEqual(attempts[0], attempts[1]); assert.equal(attempts[0].key, 'same-key');
});
for (const status of [403, 404, 409, 422, 500]) test(`HTTP ${status} preserves server error and field details, no write retries`, async () => {
  let calls = 0;
  const api = createApiClient({ baseUrl: '/api', fetcher: async () => { calls++; return json({ code: 'BUSINESS_ERROR', message: '业务提示', requestId: 'r1', fieldErrors: { quantity: ['超过可退数量'] } }, status); } });
  await assert.rejects(api.request('/orders', z.unknown(), { method: 'POST' }), (error) => error instanceof ApiError && error.status === status && error.requestId === 'r1' && error.fieldErrors?.quantity[0] === '超过可退数量');
  assert.equal(calls, 1);
});
test('HTML server errors remain HTTP errors', async () => {
  const api = createApiClient({ baseUrl: '/api', fetcher: async () => new Response('<html>failure</html>', { status: 500 }) });
  await assert.rejects(api.request('/data', z.unknown()), (error) => error instanceof ApiError && error.status === 500);
});
test('schema mismatch and network failure are explicit, never silently replaced with mock data', async () => {
  const malformed = createApiClient({ baseUrl: '/api', fetcher: async () => json({ total: 'wrong' }) });
  await assert.rejects(malformed.request('/data', z.object({ total: z.number() })), (error) => error instanceof ApiError && error.code === 'INVALID_RESPONSE');
  const offline = createApiClient({ baseUrl: '/api', fetcher: async () => { throw new TypeError('offline'); } });
  await assert.rejects(offline.request('/data', z.unknown()), (error) => error instanceof ApiError && error.code === 'NETWORK_ERROR');
});
test('cancellation does not become a network error or refresh request', async () => {
  const controller = new AbortController(); controller.abort();
  const api = createApiClient({ baseUrl: '/api', fetcher: async (_url, init) => { init?.signal?.throwIfAborted(); return json({}); } });
  await assert.rejects(api.request('/data', z.unknown(), { signal: controller.signal }), (error) => error instanceof DOMException && error.name === 'AbortError');
});
test('missing real API base fails clearly', async () => {
  const api = createApiClient({ baseUrl: '', fetcher: async () => { throw new Error('must not fetch'); } });
  await assert.rejects(api.request('/data', z.unknown()), (error) => error instanceof ApiError && error.code === 'CONFIG_ERROR');
});

test('disabled accounts cannot restore an authenticated session', async () => {
  let expired = 0; let received = 0;
  const api = createApiClient({ baseUrl: '/api', onUnauthorized: () => expired++, onSession: () => received++, fetcher: async () => json({ ...session, user: { ...user, status: 'DISABLED' } }) });
  await assert.rejects(api.refresh(), (error) => error instanceof ApiError && error.status === 403);
  assert.equal(received, 0); assert.equal(expired, 1);
});
