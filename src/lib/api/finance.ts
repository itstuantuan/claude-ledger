import { api } from './auth';
import type { ListParams } from './customers';
import { paymentInputSchema, paymentPageSchema, paymentSchema, prepaidInputSchema, prepaidPageSchema, prepaidSchema, returnInputSchema, returnPageSchema, returnSchema, type PaymentInput, type PrepaidInput, type ReturnInput } from '@/features/finance/schema';

function query(params: ListParams = {}) { const search = new URLSearchParams(); for (const [key,value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key,String(value)); return search.size ? `?${search}` : ''; }

export const paymentsApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/payments${query(params)}`, paymentPageSchema, { signal }),
  create: (input: PaymentInput, idempotencyKey: string) => api.request('/payments', paymentSchema, { method:'POST', body:paymentInputSchema.parse(input), idempotencyKey }),
};
export const prepaidApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/prepaid${query(params)}`, prepaidPageSchema, { signal }),
  create: (input: PrepaidInput, idempotencyKey: string) => api.request('/prepaid', prepaidSchema, { method:'POST', body:prepaidInputSchema.parse(input), idempotencyKey }),
};
export const returnsApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/returns${query(params)}`, returnPageSchema, { signal }),
  create: (input: ReturnInput, idempotencyKey: string) => api.request('/returns', returnSchema, { method:'POST', body:returnInputSchema.parse(input), idempotencyKey }),
};
