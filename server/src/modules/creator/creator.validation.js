import { z } from 'zod';

export const statsQuerySchema = {
  query: z.object({
    range: z.enum(['7d', '30d', '90d']).default('30d'),
  }),
};

export const salesQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(48).optional(),
  }),
};

export default {
  statsQuerySchema,
  salesQuerySchema,
};
