import { dashboardSchema } from '@/features/dashboard/schema';
import { api } from './auth';
export const dashboardApi = { get: (signal?: AbortSignal) => api.request('/dashboard/summary', dashboardSchema, { signal }) };
