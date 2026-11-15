import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const getUsersSchema = {
  query: z.object({
    q: z.string().optional(),
    role: z.enum(['buyer', 'creator', 'admin']).optional(),
    banned: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(48).optional(),
  }),
};

export const updateUserSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'User ID is required' })
      .trim()
      .regex(objectIdRegex, 'Invalid user ID'),
  }),
  body: z.object({
    role: z.enum(['buyer', 'creator', 'admin']).optional(),
    isBanned: z.boolean().optional(),
  }),
};

export const getAssetsSchema = {
  query: z.object({
    status: z.enum(['published', 'rejected', 'archived']).optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(48).optional(),
  }),
};

export const updateAssetSchema = {
  params: z.object({
    id: z
      .string({ required_error: 'Asset ID is required' })
      .trim()
      .regex(objectIdRegex, 'Invalid asset ID'),
  }),
  body: z
    .object({
      status: z.enum(['published', 'rejected', 'archived']).optional(),
      isFeatured: z.boolean().optional(),
      rejectionReason: z
        .string()
        .max(300, 'Rejection reason cannot exceed 300 characters')
        .optional(),
    })
    .refine(
      (data) => {
        if (
          data.status === 'rejected' &&
          (!data.rejectionReason || !data.rejectionReason.trim())
        ) {
          return false;
        }
        return true;
      },
      {
        message: 'Rejection reason is required when rejecting an asset',
        path: ['rejectionReason'],
      }
    ),
};

export default {
  getUsersSchema,
  updateUserSchema,
  getAssetsSchema,
  updateAssetSchema,
};
