import { z } from 'zod';
import { sessionSchema, userSchema, type LoginInput } from '@/features/auth/schema';
import { useAuthStore } from '@/stores/auth-store';
import { createApiClient } from './client';
import { ApiError, errorMessage } from './errors';

export const isMock = process.env.NEXT_PUBLIC_API_MODE === 'mock';
export const api = createApiClient({
  baseUrl: isMock ? '/api/mock' : process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  onSession: (session) => useAuthStore.getState().setUser(session.user),
  onUnauthorized: () => useAuthStore.getState().clear(),
});
export const authApi = {
  async login(input: LoginInput) {
    const session = await api.request('/auth/login', sessionSchema, { method: 'POST', body: input, auth: false });
    if (session.user.status !== 'ACTIVE') throw new ApiError(403, '该账号已停用，请联系管理员。');
    api.clearSession(); api.setToken(session.accessToken); useAuthStore.getState().setUser(session.user);
    return session.user;
  },
  async restore() {
    try { await api.refresh(); }
    catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) useAuthStore.getState().clear();
      else useAuthStore.getState().fail(errorMessage(error));
    }
  },
  async logout() {
    // A failed server logout must be visible: do not claim the refresh cookie was revoked.
    await api.request('/auth/logout', z.unknown(), { method: 'POST', auth: false });
    api.clearSession(); useAuthStore.getState().clear();
  },
  me: (signal?: AbortSignal) => api.request('/auth/me', userSchema, { signal }),
};
