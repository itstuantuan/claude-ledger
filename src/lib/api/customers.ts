import { z } from 'zod';
import { api } from './auth';
import {
  projectPageSchema, projectSchema, teamPageSchema, teamSchema, workerPageSchema, workerSchema,
  type ProjectInput, type TeamInput, type WorkerInput,
} from '@/features/customers/schema';

export type ListParams = Record<string, string | number | undefined | null>;
function query(params: ListParams = {}) {
  const value = new URLSearchParams();
  for (const [key, item] of Object.entries(params)) if (item !== undefined && item !== null && item !== '') value.set(key, String(item));
  const result = value.toString();
  return result ? `?${result}` : '';
}
export const workersApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/workers${query(params)}`, workerPageSchema, { signal }),
  get: (id: string, signal?: AbortSignal) => api.request(`/workers/${id}`, workerSchema, { signal }),
  create: (input: WorkerInput) => api.request('/workers', workerSchema, { method: 'POST', body: input }),
  update: (id: string, input: WorkerInput) => api.request(`/workers/${id}`, workerSchema, { method: 'PATCH', body: input }),
};
export const teamsApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/teams${query(params)}`, teamPageSchema, { signal }),
  get: (id: string, signal?: AbortSignal) => api.request(`/teams/${id}`, teamSchema, { signal }),
  create: (input: TeamInput) => api.request('/teams', teamSchema, { method: 'POST', body: input }),
  update: (id: string, input: TeamInput) => api.request(`/teams/${id}`, teamSchema, { method: 'PATCH', body: input }),
};
export const projectsApi = {
  list: (params?: ListParams, signal?: AbortSignal) => api.request(`/projects${query(params)}`, projectPageSchema, { signal }),
  get: (id: string, signal?: AbortSignal) => api.request(`/projects/${id}`, projectSchema, { signal }),
  create: (input: ProjectInput) => api.request('/projects', projectSchema, { method: 'POST', body: input }),
  update: (id: string, input: ProjectInput) => api.request(`/projects/${id}`, projectSchema, { method: 'PATCH', body: input }),
};
export const customerSearchSchema = z.array(z.object({ id: z.string(), label: z.string(), secondary: z.string(), type: z.enum(['worker', 'team', 'project']), href: z.string() }));

