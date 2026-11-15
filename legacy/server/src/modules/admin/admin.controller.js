import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as adminService from './admin.service.js';

export const getAdminStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getAdminStats();
  return ok(res, stats);
});

export const getUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await adminService.getUsers(req.query);
  return ok(res, users, { meta });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(
    req.user,
    req.params.id,
    req.body
  );
  return ok(res, user);
});

export const getAssets = asyncHandler(async (req, res) => {
  const { assets, meta } = await adminService.getAssets(req.query);
  return ok(res, assets, { meta });
});

export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await adminService.updateAsset(req.params.id, req.body);
  return ok(res, asset);
});

export default {
  getAdminStats,
  getUsers,
  updateUser,
  getAssets,
  updateAsset,
};
