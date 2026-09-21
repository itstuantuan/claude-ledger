import { ledgerStatementSchema } from '@/features/ledger/schema';
import { api } from './auth';

export type StatementParams = { workerId: string; from?: string; to?: string };

export const ledgerApi = {
  statement: (params: StatementParams, signal?: AbortSignal) => {
    const search = new URLSearchParams({ workerId: params.workerId });
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    return api.request(`/ledger/statement?${search}`, ledgerStatementSchema, { signal });
  },
};
