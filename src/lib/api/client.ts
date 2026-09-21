import { z } from 'zod';
import { sessionSchema, type Session } from '@/features/auth/schema';
import { ApiError } from './errors';

type ClientOptions = {
  baseUrl: string;
  fetcher?: typeof fetch;
  onSession?: (session: Session) => void;
  onUnauthorized?: () => void;
};
type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal; auth?: boolean; idempotencyKey?: string };

export function createApiClient(options: ClientOptions) {
  let token: string | null = null;
  let generation = 0;
  let refreshing: Promise<Session> | null = null;
  const fetcher = options.fetcher ?? fetch;
  function clearSession() { generation++; token = null; refreshing = null; }
  async function send(path: string, init: RequestOptions, accessToken: string | null) {
    if (!options.baseUrl) throw new ApiError(0, '未配置 API 地址，请联系管理员。', 'CONFIG_ERROR');
    if (!path.startsWith('/') || path.startsWith('//')) throw new ApiError(0, 'API 路径无效。', 'CONFIG_ERROR');
    const headers = new Headers({ Accept: 'application/json' });
    if (init.body !== undefined) headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (init.idempotencyKey) headers.set('Idempotency-Key', init.idempotencyKey);
    let response: Response;
    try {
      response = await fetcher(options.baseUrl.replace(/\/$/, '') + path, {
        method: init.method ?? 'GET', headers, credentials: 'include', cache: 'no-store',
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: init.signal,
      });
    } catch (error) {
      if (init.signal?.aborted) throw error;
      throw new ApiError(0, '无法连接服务，请检查网络后重试。', 'NETWORK_ERROR');
    }
    const raw = await response.text();
    let data: unknown;
    try { data = raw ? JSON.parse(raw) : undefined; }
    catch {
      if (!response.ok) throw ApiError.fromResponse(response.status, undefined, response.headers.get('x-request-id') ?? undefined);
      throw new ApiError(502, '服务返回的数据格式不正确。', 'INVALID_RESPONSE');
    }
    if (!response.ok) throw ApiError.fromResponse(response.status, data, response.headers.get('x-request-id') ?? undefined);
    return data;
  }
  async function refresh(): Promise<Session> {
    if (refreshing) return refreshing;
    const started = generation;
    const promise = (async () => {
      try {
        const session = sessionSchema.parse(await send('/auth/refresh', { method: 'POST', auth: false }, null));
        if (session.user.status !== 'ACTIVE') throw new ApiError(403, '该账号已停用，请联系管理员。', 'ACCOUNT_DISABLED');
        if (started !== generation) throw new ApiError(401, '会话已结束，请重新登录。', 'SESSION_ENDED');
        token = session.accessToken;
        options.onSession?.(session);
        return session;
      } catch (error) {
        if (started === generation && error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearSession(); options.onUnauthorized?.();
        }
        throw error instanceof z.ZodError ? new ApiError(502, '会话响应格式错误。', 'INVALID_RESPONSE') : error;
      }
    })();
    refreshing = promise;
    try { return await promise; } finally { if (refreshing === promise) refreshing = null; }
  }
  async function request<T>(path: string, schema: z.ZodType<T>, init: RequestOptions = {}): Promise<T> {
    const started = generation;
    const usedToken = init.auth === false ? null : token;
    let data: unknown;
    try { data = await send(path, init, usedToken); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || init.auth === false) throw error;
      if (started !== generation) throw error;
      // A concurrent request may already have refreshed the token.
      if (!token || token === usedToken) await refresh();
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (started !== generation) throw new ApiError(401, '会话已结束。', 'SESSION_ENDED');
      try { data = await send(path, init, token); }
      catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401 && started === generation) { clearSession(); options.onUnauthorized?.(); }
        throw retryError;
      }
    }
    if (init.auth !== false && started !== generation) throw new ApiError(401, '会话已结束。', 'SESSION_ENDED');
    const result = schema.safeParse(data);
    if (!result.success) throw new ApiError(502, '服务返回的数据格式不正确。', 'INVALID_RESPONSE');
    return result.data;
  }
  return { request, refresh, clearSession, setToken(value: string) { token = value; }, getGeneration: () => generation };
}
