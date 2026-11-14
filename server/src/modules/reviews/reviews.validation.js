import { z } from 'zod';

export const listReviewsQuerySchema = z.object({
  asset: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid asset ID'),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 24))
    .pipe(z.number().int().min(1).max(48).default(24)),
});

export const createReviewBodySchema = z.object({
  assetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid asset ID'),
  rating: z.coerce
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment cannot exceed 1000 characters')
    .optional()
    .default(''),
});

export const updateReviewBodySchema = z
  .object({
    rating: z.coerce
      .number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5')
      .optional(),
    comment: z
      .string()
      .trim()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional(),
  })
  .refine(
    (data) => data.rating !== undefined || data.comment !== undefined,
    { message: 'At least one of rating or comment must be provided' }
  );

export const reviewIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid review ID'),
});
