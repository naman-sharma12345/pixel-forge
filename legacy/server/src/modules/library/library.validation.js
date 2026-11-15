import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const claimSchema = {
  params: z.object({
    assetId: z
      .string({ required_error: 'Asset ID is required' })
      .trim()
      .regex(objectIdRegex, 'Invalid asset ID'),
  }),
};

export const getLibrarySchema = {
  query: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(48).optional(),
  }),
};

export default {
  claimSchema,
  getLibrarySchema,
};
