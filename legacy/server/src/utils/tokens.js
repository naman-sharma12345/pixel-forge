import jwt from 'jsonwebtoken';
import { env, isProd } from '../config/env.js';

export function signAccessToken(user) {
  const userId = user._id ? user._id.toString() : user.id || user.sub;
  return jwt.sign(
    { sub: userId, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

export function signRefreshToken(user) {
  const userId = user._id ? user._id.toString() : user.id || user.sub;
  return jwt.sign(
    { sub: userId, tv: user.tokenVersion },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export function setRefreshCookie(res, token) {
  res.cookie('pf_rt', token, {
    httpOnly: true,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie('pf_rt', {
    httpOnly: true,
    path: '/api/auth',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });
}
