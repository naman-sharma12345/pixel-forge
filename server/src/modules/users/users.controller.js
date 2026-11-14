import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as usersService from './users.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getMe(req.user);
  return ok(res, user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user._id, req.body);
  return ok(res, user);
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const user = await usersService.updateAvatar(req.user._id, req.file);
  return ok(res, user);
});

export const updatePassword = asyncHandler(async (req, res) => {
  await usersService.updatePassword(req.user._id, req.body);
  return ok(res, null, {
    message: 'Password updated. Please log in again on other devices.'
  });
});

export const becomeCreator = asyncHandler(async (req, res) => {
  const user = await usersService.becomeCreator(req.user._id);
  return ok(res, user, {
    message: 'You are now a creator! Head to the Creator Studio.'
  });
});

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlistCards = await usersService.getWishlist(req.user._id);
  return ok(res, wishlistCards);
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const result = await usersService.addToWishlist(req.user._id, req.params.assetId);
  return ok(res, result);
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const result = await usersService.removeFromWishlist(req.user._id, req.params.assetId);
  return ok(res, result);
});

export const getUserPublicProfile = asyncHandler(async (req, res) => {
  const profile = await usersService.getUserPublicProfile(req.params.username);
  return ok(res, profile);
});
