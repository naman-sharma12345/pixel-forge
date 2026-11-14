import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be between 2 and 50 characters')
    .max(50, 'Name must be between 2 and 50 characters'),
  username: z.string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be between 3 and 20 characters')
    .max(20, 'Username must be between 3 and 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers and underscores'),
  email: z.string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z.string()
    .min(8, 'Password must be between 8 and 72 characters')
    .max(72, 'Password must be between 8 and 72 characters')
    .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
      message: 'Use at least one letter and one number'
    })
});

export const loginSchema = z.object({
  identifier: z.string()
    .trim()
    .min(3, 'Identifier must be between 3 and 100 characters')
    .max(100, 'Identifier must be between 3 and 100 characters'),
  password: z.string()
    .min(1, 'Password is required')
    .max(72, 'Password cannot exceed 72 characters')
});
