import { z } from 'zod';
import { entityStatusSchema, pageMetaSchema } from '@/features/customers/schema';

export const materialSchema = z.object({
  id: z.string(), name: z.string(), category: z.string(), brand: z.string(), specification: z.string(),
  unit: z.string(), defaultPrice: z.string(), costPrice: z.string(), status: entityStatusSchema,
  salesCount: z.number().int(), version: z.number().int(),
});
export const materialPageSchema = pageMetaSchema.extend({ items: z.array(materialSchema) });
export const materialInputSchema = z.object({
  name: z.string().trim().min(1, '请输入材料名称').max(80),
  category: z.string().trim().min(1, '请输入材料分类').max(40),
  brand: z.string().trim().min(1, '请输入品牌').max(40),
  specification: z.string().trim().min(1, '请输入规格').max(40),
  unit: z.string().trim().min(1, '请输入单位').max(12),
  defaultPrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/, '请输入正确的默认售价'),
  costPrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/, '请输入正确的成本价'),
  status: entityStatusSchema.default('ACTIVE'), version: z.number().int().optional(),
});
export const pricingItemSchema = z.object({
  materialId: z.string(), materialName: z.string(), brand: z.string(), specification: z.string(), unit: z.string(),
  defaultPrice: z.string(), customerPrice: z.string().nullable(), effectivePrice: z.string(),
});
export const pricingListSchema = z.array(pricingItemSchema);
export const pricingBatchInputSchema = z.object({
  workerId: z.string().min(1), prices: z.array(z.object({
    materialId: z.string(), price: z.string().regex(/^\d+(?:\.\d{1,2})?$/).nullable(),
  })),
});

export type Material = z.infer<typeof materialSchema>;
export type MaterialInput = z.input<typeof materialInputSchema>;
export type PricingItem = z.infer<typeof pricingItemSchema>;
export type PricingBatchInput = z.infer<typeof pricingBatchInputSchema>;
