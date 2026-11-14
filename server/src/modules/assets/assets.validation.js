import { z } from 'zod';
import { CATEGORIES, LICENSES } from '../../constants.js';

const parseStringArray = (val) => {
  if (Array.isArray(val)) {
    return val
      .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

const parseJsonMeta = (val) => {
  if (!val) return undefined;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const metaSchema = z
  .object({
    resolution: z.string().trim().optional(),
    frames: z.coerce.number().int().min(1).optional(),
    durationSec: z.coerce.number().min(0).optional(),
    bpm: z.coerce.number().min(0).optional(),
    loopable: z
      .union([z.boolean(), z.string()])
      .transform((val) => (typeof val === 'string' ? val === 'true' : Boolean(val)))
      .optional(),
    sampleRate: z.coerce.number().min(0).optional(),
  })
  .optional();

export const listAssetsQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    category: z.enum(CATEGORIES).optional(),
    tags: z.string().trim().optional(),
    minPrice: z
      .string()
      .optional()
      .transform((val) => (val !== undefined && val !== '' ? Number(val) : undefined))
      .pipe(z.number().min(0).max(50000).optional()),
    maxPrice: z
      .string()
      .optional()
      .transform((val) => (val !== undefined && val !== '' ? Number(val) : undefined))
      .pipe(z.number().min(0).max(50000).optional()),
    free: z.enum(['true', 'false']).optional(),
    license: z.enum(LICENSES).optional(),
    mediaKind: z.enum(['image', 'audio', 'other']).optional(),
    creator: z.string().trim().optional(),
    sort: z
      .enum(['relevance', 'newest', 'popular', 'top-rated', 'price-asc', 'price-desc'])
      .default('newest'),
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
  })
  .refine(
    (data) => !(data.sort === 'relevance' && !data.q),
    {
      message: 'Relevance sort is only allowed when search query "q" is provided',
      path: ['sort'],
    }
  );

export const listMineQuerySchema = z.object({
  status: z.enum(['published', 'rejected', 'archived']).optional(),
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

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required'),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid asset ID'),
});

export const createAssetBodySchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be 3-80 characters')
    .max(80, 'Title must be 3-80 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(20, 'Description must be 20-5000 characters')
    .max(5000, 'Description must be 20-5000 characters'),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  tags: z
    .preprocess(
      parseStringArray,
      z
        .array(z.string().max(24, 'Tag must be max 24 characters'))
        .max(10, 'Maximum 10 tags allowed')
    )
    .default([]),
  price: z
    .preprocess(
      (val) => (val === undefined || val === '' ? 0 : Number(val)),
      z
        .number({ invalid_type_error: 'Price must be a number' })
        .int('Price must be an integer')
        .min(0, 'Price must be between 0 and 50000')
        .max(50000, 'Price must be between 0 and 50000')
    )
    .default(0),
  license: z.enum(LICENSES).default('standard'),
  fileFormats: z
    .preprocess(parseStringArray, z.array(z.string()))
    .default([]),
  meta: z.preprocess(parseJsonMeta, metaSchema).optional(),
});

export const updateAssetBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be 3-80 characters')
    .max(80, 'Title must be 3-80 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be 20-5000 characters')
    .max(5000, 'Description must be 20-5000 characters')
    .optional(),
  category: z.enum(CATEGORIES).optional(),
  tags: z
    .preprocess(
      (val) => (val !== undefined ? parseStringArray(val) : undefined),
      z
        .array(z.string().max(24, 'Tag must be max 24 characters'))
        .max(10, 'Maximum 10 tags allowed')
        .optional()
    )
    .optional(),
  price: z
    .preprocess(
      (val) => (val !== undefined && val !== '' ? Number(val) : undefined),
      z
        .number()
        .int('Price must be an integer')
        .min(0, 'Price must be between 0 and 50000')
        .max(50000, 'Price must be between 0 and 50000')
        .optional()
    )
    .optional(),
  license: z.enum(LICENSES).optional(),
  fileFormats: z
    .preprocess(
      (val) => (val !== undefined ? parseStringArray(val) : undefined),
      z.array(z.string()).optional()
    )
    .optional(),
  meta: z.preprocess(parseJsonMeta, metaSchema).optional(),
});
