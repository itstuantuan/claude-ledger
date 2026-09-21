// Local contract mock only. Never an authentication backend for production data.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { loginSchema, permissions, type Role, type User } from '@/features/auth/schema';

const cookieName = 'paint_mock_session';
const secret = randomBytes(32);
const sessions = new Map<string, { user: User; expires: number }>();
const grants: Record<Role, User['permissions']> = {
  OWNER: [...permissions],
  FINANCE: ['workers:read', 'materials:read', 'finance:read', 'payments:create', 'prepaid:deposit', 'reconciliation:read', 'reports:read'],
  CLERK: ['workers:read', 'materials:read', 'orders:create', 'returns:request'],
};
const accounts = [{ account: 'owner', name: '门店老板', role: 'OWNER' }, { account: 'finance', name: '门店财务', role: 'FINANCE' }, { account: 'clerk', name: '门店店员', role: 'CLERK' }] as const;
export function mockFail(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
  return NextResponse.json({ code, message, requestId: crypto.randomUUID(), fieldErrors }, { status, headers: { 'Cache-Control': 'no-store' } });
}
function issueToken(id: string) {
  const payload = Buffer.from(JSON.stringify({ id, expires: Date.now() + 60_000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`;
}
function readToken(token: string): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof parsed !== 'object' || parsed === null || !('id' in parsed) || !('expires' in parsed)) return null;
    return typeof parsed.id === 'string' && typeof parsed.expires === 'number' && parsed.expires > Date.now() ? parsed.id : null;
  } catch { return null; }
}
export async function handleMockAuth(request: NextRequest, path: string[]) {
  if (process.env.NEXT_PUBLIC_API_MODE !== 'mock' || (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_MOCK_BUILD !== 'true')) return mockFail(404, 'NOT_FOUND', '接口不存在。');
  const requestOrigin = new URL(request.nextUrl.protocol + '//' + (request.headers.get('host') ?? request.nextUrl.host));
  const host = requestOrigin.hostname;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return mockFail(403, 'LOCAL_ONLY', '模拟服务仅允许本机访问。');
  if (request.method !== 'GET' && request.headers.get('origin') !== requestOrigin.origin) return mockFail(403, 'INVALID_ORIGIN', '请求来源不允许。');
  const action = path.join('/');
  for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id);
  const refreshId = request.cookies.get(cookieName)?.value;
  if (action === 'auth/login' && request.method === 'POST') {
    const body = loginSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return mockFail(422, 'VALIDATION_ERROR', '请填写账号与密码。');
    const account = accounts.find((item) => item.account === body.data.account);
    if (!account || body.data.password !== 'Paint123!') return mockFail(401, 'INVALID_CREDENTIALS', '账号或密码不正确。', { password: ['账号或密码不正确'] });
    if (refreshId) sessions.delete(refreshId);
    const id = randomBytes(32).toString('hex');
    const user: User = { ...account, id: `mock-${account.account}`, permissions: grants[account.role], status: 'ACTIVE' };
    sessions.set(id, { user, expires: Date.now() + 8 * 60 * 60_000 });
    const response = NextResponse.json({ accessToken: issueToken(id), expiresIn: 60, user }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(cookieName, id, { httpOnly: true, sameSite: 'lax', path: '/api/mock', maxAge: 8 * 60 * 60, secure: request.nextUrl.protocol === 'https:' });
    return response;
  }
  if (action === 'auth/logout' && request.method === 'POST') {
    if (refreshId) sessions.delete(refreshId);
    const response = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(cookieName, '', { path: '/api/mock', httpOnly: true, sameSite: 'lax', maxAge: 0 });
    return response;
  }
  if (action === 'auth/refresh' && request.method === 'POST') {
    const session = refreshId ? sessions.get(refreshId) : undefined;
    return session ? NextResponse.json({ accessToken: issueToken(refreshId!), expiresIn: 60, user: session.user }, { headers: { 'Cache-Control': 'no-store' } }) : mockFail(401, 'SESSION_EXPIRED', '登录已过期，请重新登录。');
  }
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const id = readToken(token);
  const session = id ? sessions.get(id) : undefined;
  if (!session) return mockFail(401, 'UNAUTHENTICATED', '请先登录。');
  if (action === 'auth/me' && request.method === 'GET') return NextResponse.json(session.user, { headers: { 'Cache-Control': 'no-store' } });
  return mockFail(404, 'NOT_FOUND', '此接口尚未开放。');
}

export function authenticateMock(request: NextRequest): User | null {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const id = readToken(token);
  const session = id ? sessions.get(id) : undefined;
  return session && session.expires > Date.now() ? session.user : null;
}
