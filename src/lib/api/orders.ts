import { api } from './auth';
import { orderAdjustmentListSchema, orderAdjustmentSchema, orderPageSchema, orderSchema, type OrderAdjustmentInput, type OrderInput } from '@/features/orders/schema';
import type { ListParams } from './customers';
import { toApiDateTime } from '@/lib/utils/datetime';

function query(params: ListParams = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  return search.size ? `?${search}` : '';
}
export const ordersApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/orders${query(params)}`, orderPageSchema, { signal }),
  get: (id: string, signal?: AbortSignal) => api.request(`/orders/${id}`, orderSchema, { signal }),
  create: (input: OrderInput, idempotencyKey: string) => api.request('/orders', orderSchema, {
    method: 'POST',
    body: { ...input, occurredAt: toApiDateTime(input.occurredAt) },
    idempotencyKey,
  }),
  listAdjustments: (id: string, signal?: AbortSignal) => api.request(`/orders/${id}/adjustments`, orderAdjustmentListSchema, { signal }),
  adjust: (id: string, input: OrderAdjustmentInput, idempotencyKey: string) => api.request(`/orders/${id}/adjustments`, orderAdjustmentSchema, {
    method: 'POST', body: { ...input, occurredAt: toApiDateTime(input.occurredAt) }, idempotencyKey,
  }),
};
