import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const addItemSchema = {
  body: z.object({
    assetId: z
      .string({ required_error: 'Asset ID is required' })
      .trim()
      .regex(objectIdRegex, 'Invalid asset ID'),
  }),
};

export const removeItemSchema = {
  params: z.object({
    assetId: z
      .string({ required_error: 'Asset ID is required' })
      .trim()
      .regex(objectIdRegex, 'Invalid asset ID'),
  }),
};

export default {
  addItemSchema,
  removeItemSchema,
};
