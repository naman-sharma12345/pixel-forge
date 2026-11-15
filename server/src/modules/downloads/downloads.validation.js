import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const getDownloadLinkSchema = {
  params: z.object({
    assetId: z
      .string({ required_error: 'Asset ID is required' })
      .trim()
      .regex(objectIdRegex, 'Invalid asset ID'),
  }),
};

export const downloadFileSchema = {
  params: z.object({
    token: z
      .string({ required_error: 'Download token is required' })
      .trim()
      .min(1, 'Download token cannot be empty'),
  }),
};

export default {
  getDownloadLinkSchema,
  downloadFileSchema,
};
