import { z } from 'zod';

import { isValidISODate } from '@/shared/lib/dates';
import { parseAmount } from '@/shared/lib/money';
import { MAX_NOTE_LENGTH } from './types';

/** Validates a TransactionDraft from the form and converts it to storable values. */
export const draftSchema = z.object({
  type: z.enum(['income', 'expense']),
  amountText: z
    .string()
    .transform((s, ctx) => {
      const minor = parseAmount(s);
      if (minor === null) {
        ctx.addIssue({ code: 'custom', message: 'Enter an amount greater than 0' });
        return z.NEVER;
      }
      return minor;
    }),
  categoryId: z.string().min(1, 'Pick a category'),
  occurredOn: z.string().refine(isValidISODate, 'Invalid date'),
  note: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= MAX_NOTE_LENGTH, `Note is too long (max ${MAX_NOTE_LENGTH})`),
});

export type ValidDraft = z.output<typeof draftSchema>;
