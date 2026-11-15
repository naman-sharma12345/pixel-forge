import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as libraryService from './library.service.js';

export const getLibrary = asyncHandler(async (req, res) => {
  const { items, meta } = await libraryService.getLibrary(req.user, req.query);
  return ok(res, items, { meta });
});

export const claimAsset = asyncHandler(async (req, res) => {
  const item = await libraryService.claimAsset(req.user, req.params.assetId);
  return created(res, item, { message: 'Added to your library' });
});

export default {
  getLibrary,
  claimAsset,
};
