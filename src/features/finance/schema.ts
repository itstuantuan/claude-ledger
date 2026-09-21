import { z } from 'zod';
import { pageMetaSchema } from '@/features/customers/schema';
import { paymentMethodSchema } from '@/features/orders/schema';

const moneyInputSchema = z.string().regex(/^\d+(?:\.\d{1,2})?$/, '金额格式不正确').refine((value) => Number(value) > 0, '金额必须大于 0');
const quantitySchema = z.string().regex(/^\d+(?:\.\d{1,3})?$/, '数量格式不正确').refine((value) => Number(value) > 0, '数量必须大于 0');

export const paymentInputSchema = z.object({
  workerId: z.string().min(1, '请选择油漆工'), amount: moneyInputSchema,
  paymentMethod: paymentMethodSchema, occurredAt: z.string().min(1, '请选择收款时间'),
  note: z.string().trim().max(200).default(''),
});
export const prepaidInputSchema = paymentInputSchema.omit({ paymentMethod: true }).extend({ paymentMethod: paymentMethodSchema });

const financeRecordBase = z.object({
  id: z.string(), transactionNo: z.string(), workerId: z.string(), workerName: z.string(),
  amount: z.string(), paymentMethod: paymentMethodSchema, occurredAt: z.string(),
  note: z.string(), operatorName: z.string(), createdAt: z.string(),
});
export const paymentSchema = financeRecordBase.extend({ receivableBefore: z.string(), receivableAfter: z.string() });
export const prepaidSchema = financeRecordBase.extend({ balanceBefore: z.string(), balanceAfter: z.string() });
export const paymentPageSchema = pageMetaSchema.extend({ items: z.array(paymentSchema) });
export const prepaidPageSchema = pageMetaSchema.extend({ items: z.array(prepaidSchema) });

export const returnInputSchema = z.object({
  orderId: z.string().min(1, '请选择原用料单'),
  occurredAt: z.string().min(1, '请选择退料日期').default(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())),
  items: z.array(z.object({ materialId: z.string(), quantity: quantitySchema })).min(1, '至少选择一种退料材料'),
  note: z.string().trim().max(200).default(''),
});
export const returnStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'REVERSED']);
export const returnSchema = z.object({
  id: z.string(), returnNo: z.string(), orderId: z.string(), orderNo: z.string(), workerId: z.string(), workerName: z.string(),
  items: z.array(z.object({ materialId: z.string(), materialName: z.string(), unit: z.string(), quantity: z.string(), unitPrice: z.string(), amount: z.string() })),
  amount: z.string(), receivableReduction: z.string(), status: returnStatusSchema, note: z.string(), operatorName: z.string(), occurredAt: z.string(), createdAt: z.string(),
});
export const returnPageSchema = pageMetaSchema.extend({ items: z.array(returnSchema) });

export type PaymentInput = z.input<typeof paymentInputSchema>;
export type PrepaidInput = z.input<typeof prepaidInputSchema>;
export type ReturnInput = z.input<typeof returnInputSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Prepaid = z.infer<typeof prepaidSchema>;
export type ReturnRecord = z.infer<typeof returnSchema>;
