import { z } from 'zod';
import { pageMetaSchema } from '@/features/customers/schema';

const moneySchema = z.string().regex(/^\d+(?:\.\d{1,2})?$/, '金额格式不正确');
const quantitySchema = z.string().regex(/^\d+(?:\.\d{1,3})?$/, '数量格式不正确').refine((value) => Number(value) > 0, '数量必须大于 0');
export const orderStatusSchema = z.enum(['DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'REVERSED']);
export const paymentMethodSchema = z.enum(['WECHAT', 'ALIPAY', 'CASH', 'BANK_CARD', 'OTHER']);
export const orderItemInputSchema = z.object({
  materialId: z.string().min(1, '请选择材料'), quantity: quantitySchema,
  unitPrice: moneySchema, discount: moneySchema.default('0.00'),
});
export const orderInputSchema = z.object({
  workerId: z.string().min(1, '请选择油漆工'), projectId: z.string().nullable().default(null),
  occurredAt: z.string().min(1, '请选择业务日期'),
  items: z.array(orderItemInputSchema).min(1, '至少添加一种材料'),
  paymentAmount: moneySchema.default('0.00'), prepaidDeduction: moneySchema.default('0.00'),
  paymentMethod: paymentMethodSchema.nullable().default(null), note: z.string().trim().max(200).default(''),
}).superRefine((value, context) => {
  if (Number(value.paymentAmount) > 0 && !value.paymentMethod) context.addIssue({ code: 'custom', path: ['paymentMethod'], message: '请选择付款方式' });
});
export const orderItemSchema = z.object({
  materialId: z.string(), materialName: z.string(), specification: z.string(), unit: z.string(),
  quantity: z.string(), unitPrice: z.string(), discount: z.string(), subtotal: z.string(),
});
export const orderSchema = z.object({
  id: z.string(), orderNo: z.string(), workerId: z.string(), workerName: z.string(),
  projectId: z.string().nullable(), projectName: z.string().nullable(), items: z.array(orderItemSchema),
  goodsAmount: z.string(), discountAmount: z.string(), finalAmount: z.string(),
  paymentAmount: z.string(), prepaidDeduction: z.string(), addedReceivable: z.string(),
  returnedAmount: z.string(), settledAmount: z.string(), outstandingAmount: z.string(),
  paymentMethod: paymentMethodSchema.nullable(), status: orderStatusSchema, note: z.string(),
  occurredAt: z.string(), createdAt: z.string(), operatorName: z.string(),
});
export const orderPageSchema = pageMetaSchema.extend({ items: z.array(orderSchema) });

export type Order = z.infer<typeof orderSchema>;
export type OrderInput = z.input<typeof orderInputSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
