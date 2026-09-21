import { z } from 'zod';

export const entityStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export const projectStatusSchema = z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED']);

export const workerSchema = z.object({
  id: z.string(), name: z.string(), phone: z.string(), wechat: z.string().nullable(),
  teamId: z.string().nullable(), teamName: z.string().nullable(), status: entityStatusSchema,
  materialTotal: z.string(), returnTotal: z.string(), paymentTotal: z.string(),
  prepaidBalance: z.string(), receivable: z.string(), lastTransactionAt: z.string().nullable(),
  note: z.string(), version: z.number().int(),
});
export const teamSchema = z.object({
  id: z.string(), name: z.string(), leader: z.string(), phone: z.string(), memberCount: z.number().int(),
  materialTotal: z.string(), paymentTotal: z.string(), receivable: z.string(), note: z.string(),
  status: entityStatusSchema, version: z.number().int(),
});
export const projectSchema = z.object({
  id: z.string(), name: z.string(), address: z.string(), manager: z.string(),
  workerIds: z.array(z.string()), workerNames: z.array(z.string()), teamId: z.string().nullable(),
  teamName: z.string().nullable(), startDate: z.string().nullable(), endDate: z.string().nullable(),
  status: projectStatusSchema, note: z.string(), materialTotal: z.string(), version: z.number().int(),
});
export const pageMetaSchema = z.object({ page: z.number().int(), pageSize: z.number().int(), total: z.number().int() });
export const workerPageSchema = pageMetaSchema.extend({ items: z.array(workerSchema) });
export const teamPageSchema = pageMetaSchema.extend({ items: z.array(teamSchema) });
export const projectPageSchema = pageMetaSchema.extend({ items: z.array(projectSchema) });

export const workerInputSchema = z.object({
  name: z.string().trim().min(1, '请输入姓名').max(30), phone: z.string().trim().regex(/^1\d{10}$/, '请输入 11 位手机号'),
  wechat: z.string().trim().max(50).optional().default(''), teamId: z.string().nullable().default(null),
  status: entityStatusSchema.default('ACTIVE'), note: z.string().trim().max(200).optional().default(''), version: z.number().int().optional(),
});
export const teamInputSchema = z.object({
  name: z.string().trim().min(1, '请输入施工队名称').max(50), leader: z.string().trim().min(1, '请输入负责人').max(30),
  phone: z.string().trim().regex(/^1\d{10}$/, '请输入 11 位手机号'), status: entityStatusSchema.default('ACTIVE'),
  note: z.string().trim().max(200).optional().default(''), version: z.number().int().optional(),
});
export const projectInputSchema = z.object({
  name: z.string().trim().min(1, '请输入项目名称').max(80), address: z.string().trim().min(1, '请输入项目地址').max(120),
  manager: z.string().trim().min(1, '请输入负责人').max(30), workerIds: z.array(z.string()).min(1, '至少关联一名油漆工'),
  teamId: z.string().nullable().default(null), startDate: z.string().nullable().default(null), endDate: z.string().nullable().default(null),
  status: projectStatusSchema.default('PLANNING'), note: z.string().trim().max(200).optional().default(''), version: z.number().int().optional(),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, { message: '结束日期不能早于开始日期', path: ['endDate'] });

export type Worker = z.infer<typeof workerSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Project = z.infer<typeof projectSchema>;
export type WorkerInput = z.input<typeof workerInputSchema>;
export type TeamInput = z.input<typeof teamInputSchema>;
export type ProjectInput = z.input<typeof projectInputSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

