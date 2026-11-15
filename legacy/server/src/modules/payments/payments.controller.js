import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as paymentsService from './payments.service.js';

export const mockConfirm = asyncHandler(async (req, res) => {
  const result = await paymentsService.mockConfirm(req.user, req.body);
  return ok(res, result, { message: 'Payment successful!' });
});

export default {
  mockConfirm,
};
