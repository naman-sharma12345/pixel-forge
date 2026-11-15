import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const confirmSchema = {
  body: z.object({
    orderId: z
      .string({ required_error: 'Order ID is required' })
      .trim()
      .regex(objectIdRegex, 'Invalid order ID'),
    outcome: z.enum(['success', 'failure'], {
      required_error: 'Outcome must be either success or failure',
    }),
  }),
};

export default {
  confirmSchema,
};
