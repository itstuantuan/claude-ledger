import { api } from './auth';
import type { ListParams } from './customers';
import { paymentInputSchema, paymentPageSchema, paymentSchema, prepaidInputSchema, prepaidPageSchema, prepaidSchema, returnInputSchema, returnPageSchema, returnSchema, type PaymentInput, type PrepaidInput, type ReturnInput } from '@/features/finance/schema';
import { toApiDateTime } from '@/lib/utils/datetime';

function query(params: ListParams = {}) { const search = new URLSearchParams(); for (const [key,value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key,String(value)); return search.size ? `?${search}` : ''; }

export const paymentsApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/payments${query(params)}`, paymentPageSchema, { signal }),
  create: (input: PaymentInput, idempotencyKey: string) => { const body=paymentInputSchema.parse(input); return api.request('/payments', paymentSchema, { method:'POST', body:{...body,occurredAt:toApiDateTime(body.occurredAt)}, idempotencyKey }); },
};
export const prepaidApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/prepaid${query(params)}`, prepaidPageSchema, { signal }),
  create: (input: PrepaidInput, idempotencyKey: string) => { const body=prepaidInputSchema.parse(input); return api.request('/prepaid', prepaidSchema, { method:'POST', body:{...body,occurredAt:toApiDateTime(body.occurredAt)}, idempotencyKey }); },
};
export const returnsApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/returns${query(params)}`, returnPageSchema, { signal }),
  create: (input: ReturnInput, idempotencyKey: string) => { const body=returnInputSchema.parse(input); return api.request('/returns', returnSchema, { method:'POST', body:{...body,occurredAt:toApiDateTime(body.occurredAt)}, idempotencyKey }); },
};
