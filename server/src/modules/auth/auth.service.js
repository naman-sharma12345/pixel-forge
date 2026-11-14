import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/tokens.js';
import { toUserMe } from '../users/users.serializers.js';

const DUMMY_HASH = '$2a$12$uq4R7E9b8Uj6X1yZaBCDeu6iOqf8aV0f8eO5mK5R6h7J8k9L0a1B2';

export async function register({ name, username, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw ApiError.conflict('Email is already registered', 'CONFLICT', [
      { path: 'email', message: 'Email is already registered' }
    ]);
  }

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    throw ApiError.conflict('Username is taken', 'CONFLICT', [
      { path: 'username', message: 'Username is taken' }
    ]);
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: toUserMe(user),
    accessToken,
    refreshToken
  };
}

export async function login({ identifier, password }) {
  const trimmedIdentifier = identifier.trim().toLowerCase();
  const query = trimmedIdentifier.includes('@')
    ? { email: trimmedIdentifier }
    : { username: trimmedIdentifier };

  const user = await User.findOne(query).select('+passwordHash');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password');
  }

  if (user.isBanned) {
    throw new ApiError(403, 'ACCOUNT_BANNED', 'This account has been suspended');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: toUserMe(user),
    accessToken,
    refreshToken
  };
}

export async function refresh(refreshTokenFromCookie) {
  if (!refreshTokenFromCookie) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired, please log in again');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenFromCookie);
  } catch (_) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired, please log in again');
  }

  const user = await User.findById(decoded.sub);
  if (!user || decoded.tv !== user.tokenVersion) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired, please log in again');
  }

  if (user.isBanned) {
    throw new ApiError(403, 'ACCOUNT_BANNED', 'This account has been suspended');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: toUserMe(user),
    accessToken,
    refreshToken
  };
}

export async function logout(userId) {
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
}
