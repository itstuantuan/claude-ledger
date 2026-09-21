import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { handleMockAuth } from '../src/mocks/auth-service';
import { sessionSchema, userSchema } from '../src/features/auth/schema';
process.env.NEXT_PUBLIC_API_MODE = 'mock';
process.env.ALLOW_LOCAL_MOCK_BUILD = 'true';
const origin = 'http://127.0.0.1:3001';
async function request(action: string, options: { body?: unknown; cookie?: string; token?: string; origin?: string; method?: string } = {}) {
  const headers = new Headers({ host: '127.0.0.1:3001', origin: options.origin ?? origin });
  if (options.cookie) headers.set('cookie', options.cookie);
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  if (options.body) headers.set('content-type', 'application/json');
  // Next can normalize request.nextUrl to localhost, while browser Origin uses 127.0.0.1.
  return handleMockAuth(new NextRequest(`http://localhost:3001/api/mock/auth/${action}`, { method: options.method ?? 'POST', headers, body: options.body ? JSON.stringify(options.body) : undefined }), ['auth', action]);
}
for (const account of ['owner', 'finance', 'clerk']) test(`${account}: login, cookie restore, identity, logout and token revocation`, async () => {
  const response = await request('login', { body: { account, password: 'Paint123!' } });
  assert.equal(response.status, 200);
  const session = sessionSchema.parse(await response.json());
  const setCookie = response.headers.get('set-cookie')!;
  assert.match(setCookie, /httponly/i);
  assert.match(setCookie, /samesite=lax/i);
  const cookie = setCookie.split(';')[0];
  assert.equal((await request('refresh', { cookie })).status, 200);
  const me = await request('me', { method: 'GET', token: session.accessToken });
  const user = userSchema.parse(await me.json());
  assert.equal(user.account, account);
  assert.equal(user.permissions.includes('system:manage'), account === 'owner');
  assert.equal(user.permissions.includes('payments:create'), account !== 'clerk');
  assert.equal((await request('logout', { cookie })).status, 204);
  assert.equal((await request('refresh', { cookie })).status, 401);
  assert.equal((await request('me', { method: 'GET', token: session.accessToken })).status, 401);
});
test('mock rejects wrong passwords, forged access tokens and foreign origins', async () => {
  assert.equal((await request('login', { body: { account: 'owner', password: 'wrong' } })).status, 401);
  assert.equal((await request('me', { method: 'GET', token: 'forged.token' })).status, 401);
  assert.equal((await request('login', { body: { account: 'owner', password: 'Paint123!' }, origin: 'http://evil.test' })).status, 403);
});
