import User from '../models/User.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Access token required');
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Access token expired');
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid access token');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
  }

  if (user.isBanned) {
    throw new ApiError(403, 'ACCOUNT_BANNED', 'Account is suspended');
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (user && !user.isBanned) {
      req.user = user;
    }
  } catch (_) {
    req.user = null;
  }
  next();
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Forbidden resource'));
    }
    next();
  };
};
