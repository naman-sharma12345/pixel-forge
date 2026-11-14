import { z } from 'zod';

const urlOrEmpty = z
  .string()
  .max(200, 'URL cannot exceed 200 characters')
  .refine((val) => val === '' || z.string().url().safeParse(val).success, {
    message: 'Must be a valid URL or empty string'
  })
  .optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be between 2 and 50 characters').max(50, 'Name must be between 2 and 50 characters').optional(),
  username: z.string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be between 3 and 20 characters')
    .max(20, 'Username must be between 3 and 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers and underscores')
    .optional(),
  bio: z.string().max(300, 'Bio cannot exceed 300 characters').optional(),
  socials: z.object({
    website: urlOrEmpty,
    twitter: urlOrEmpty,
    itchio: urlOrEmpty,
    github: urlOrEmpty
  }).optional()
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be between 8 and 72 characters')
    .max(72, 'Password must be between 8 and 72 characters')
    .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
      message: 'Use at least one letter and one number'
    })
});

export const assetIdParamsSchema = z.object({
  assetId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid asset ID')
});

export const usernameParamsSchema = z.object({
  username: z.string().trim().min(1, 'Username is required')
});
