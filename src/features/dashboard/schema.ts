import { z } from 'zod';

const money = z.string().regex(/^\d+(?:\.\d{1,2})?$/);
export const dashboardSchema = z.object({
  generatedAt: z.string(),
  summary: z.object({ materialTotal: money, paymentTotal: money, returnTotal: money, receivable: money, activeWorkers: z.number().int(), activeProjects: z.number().int() }),
  trend: z.array(z.object({ month: z.string(), materialAmount: money, paymentAmount: money })),
  topDebtors: z.array(z.object({ workerId: z.string(), workerName: z.string(), teamName: z.string().nullable(), receivable: money })),
  recent: z.array(z.object({ id: z.string(), type: z.enum(['ORDER', 'PAYMENT', 'RETURN']), referenceNo: z.string(), workerName: z.string(), amount: money, occurredAt: z.string() })),
});
export type DashboardData = z.infer<typeof dashboardSchema>;
