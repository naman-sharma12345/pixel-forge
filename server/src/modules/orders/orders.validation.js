import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const checkoutSchema = {
  body: z.object({
    assetIds: z
      .array(z.string().trim().regex(objectIdRegex, 'Invalid asset ID'))
      .max(50, 'Cannot checkout more than 50 assets at once')
      .optional(),
  }),
};

export const getOrderSchema = {
  params: z.object({
    id: z.string().trim().regex(objectIdRegex, 'Invalid order ID'),
  }),
};

export default {
  checkoutSchema,
  getOrderSchema,
};
