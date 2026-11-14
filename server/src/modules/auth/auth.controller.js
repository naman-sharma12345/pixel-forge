import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import { setRefreshCookie, clearRefreshCookie } from '../../utils/tokens.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setRefreshCookie(res, refreshToken);
  return created(res, { user, accessToken }, { message: 'Welcome to Pixel Forge!' });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  return ok(res, { user, accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.cookies?.pf_rt;
    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
    setRefreshCookie(res, newRefreshToken);
    return ok(res, { user, accessToken });
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);
  clearRefreshCookie(res);
  return ok(res, null, { message: 'Logged out' });
});
