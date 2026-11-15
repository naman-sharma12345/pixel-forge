import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as assetsService from './assets.service.js';

export const listAssets = asyncHandler(async (req, res) => {
  const result = await assetsService.listAssets(req.query);
  return ok(res, result.items, { meta: result.meta });
});

export const getHomeAssets = asyncHandler(async (req, res) => {
  const data = await assetsService.getHomeAssets();
  return ok(res, data);
});

export const getCategories = asyncHandler(async (req, res) => {
  const data = await assetsService.getCategories();
  return ok(res, data);
});

export const getTags = asyncHandler(async (req, res) => {
  const data = await assetsService.getTopTags();
  return ok(res, data);
});

export const getMyAssets = asyncHandler(async (req, res) => {
  const result = await assetsService.getMyAssets({
    userId: req.user._id,
    query: req.query,
  });
  return ok(res, result.items, { meta: result.meta });
});

export const getAssetBySlug = asyncHandler(async (req, res) => {
  const asset = await assetsService.getAssetBySlug({
    slug: req.params.slug,
    currentUser: req.user,
  });
  return ok(res, asset);
});

export const getRelatedAssets = asyncHandler(async (req, res) => {
  const related = await assetsService.getRelatedAssets({
    slug: req.params.slug,
  });
  return ok(res, related);
});

export const createAsset = asyncHandler(async (req, res) => {
  const asset = await assetsService.createAsset({
    currentUser: req.user,
    data: req.body,
    files: req.files,
  });
  return created(res, asset);
});

export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await assetsService.updateAsset({
    id: req.params.id,
    currentUser: req.user,
    data: req.body,
    files: req.files,
  });
  return ok(res, asset);
});

export const deleteAsset = asyncHandler(async (req, res) => {
  await assetsService.archiveAsset({
    id: req.params.id,
    currentUser: req.user,
  });
  return ok(res, null);
});
