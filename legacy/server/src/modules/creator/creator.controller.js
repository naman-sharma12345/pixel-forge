import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as creatorService from './creator.service.js';

export const getCreatorStats = asyncHandler(async (req, res) => {
  const { range } = req.query;
  const result = await creatorService.getCreatorStats(req.user, range);
  return ok(res, result);
});

export const getCreatorSales = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { sales, meta } = await creatorService.getCreatorSales(
    req.user,
    page,
    limit
  );
  return ok(res, sales, { meta });
});

export default {
  getCreatorStats,
  getCreatorSales,
};
