import { z } from 'zod';

const moneySchema = z.string().regex(/^-?\d+(?:\.\d{1,2})?$/);

export const ledgerEntryTypeSchema = z.enum(['ORDER', 'PAYMENT', 'RETURN']);
export const ledgerEntrySchema = z.object({
  id: z.string(),
  type: ledgerEntryTypeSchema,
  referenceNo: z.string(),
  occurredAt: z.string(),
  description: z.string(),
  chargeAmount: moneySchema,
  paymentAmount: moneySchema,
  prepaidAmount: moneySchema,
  returnAmount: moneySchema,
  balance: moneySchema,
  operatorName: z.string(),
});

export const ledgerStatementSchema = z.object({
  worker: z.object({
    id: z.string(), name: z.string(), phone: z.string(), teamName: z.string().nullable(),
  }),
  from: z.string().nullable(),
  to: z.string().nullable(),
  generatedAt: z.string(),
  summary: z.object({
    openingBalance: moneySchema,
    chargeTotal: moneySchema,
    paymentTotal: moneySchema,
    prepaidTotal: moneySchema,
    returnTotal: moneySchema,
    closingBalance: moneySchema,
  }),
  entries: z.array(ledgerEntrySchema),
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type LedgerStatement = z.infer<typeof ledgerStatementSchema>;
