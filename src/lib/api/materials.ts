import { api } from './auth';
import { materialPageSchema, materialSchema, pricingListSchema, type MaterialInput, type PricingBatchInput } from '@/features/materials/schema';
import type { ListParams } from './customers';

function query(params: ListParams = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  return search.size ? `?${search}` : '';
}

export const materialsApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/materials${query(params)}`, materialPageSchema, { signal }),
  create: (input: MaterialInput) => api.request('/materials', materialSchema, { method: 'POST', body: input }),
  update: (id: string, input: MaterialInput) => api.request(`/materials/${id}`, materialSchema, { method: 'PATCH', body: input }),
};
export const pricingApi = {
  list: (workerId: string, signal?: AbortSignal) => api.request(`/pricing?workerId=${encodeURIComponent(workerId)}`, pricingListSchema, { signal }),
  save: (input: PricingBatchInput) => api.request('/pricing', pricingListSchema, { method: 'PATCH', body: input }),
};
