import User from '../../models/User.js';
import Asset from '../../models/Asset.js';
import { ApiError } from '../../utils/ApiError.js';
import { saveFile, deleteFile } from '../../utils/storage.js';
import { toUserMe, toUserPublic } from './users.serializers.js';
import { toAssetCard, ASSET_CARD_SELECT, CREATOR_POPULATE } from '../assets/assets.serializers.js';

export async function getMe(user) {
  return toUserMe(user);
}

export async function updateProfile(userId, data) {
  if (!data || Object.keys(data).length === 0) {
    throw ApiError.badRequest('Nothing to update');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  if (data.username) {
    const normalizedUsername = data.username.toLowerCase().trim();
    if (normalizedUsername !== user.username) {
      const existing = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: userId }
      });
      if (existing) {
        throw ApiError.conflict('Username is taken', 'CONFLICT', [
          { path: 'username', message: 'Username is taken' }
        ]);
      }
      user.username = normalizedUsername;
    }
  }

  if (data.name !== undefined) {
    user.name = data.name.trim();
  }

  if (data.bio !== undefined) {
    user.bio = data.bio;
  }

  if (data.socials !== undefined) {
    user.socials = {
      website: data.socials.website !== undefined ? data.socials.website : user.socials?.website || '',
      twitter: data.socials.twitter !== undefined ? data.socials.twitter : user.socials?.twitter || '',
      itchio: data.socials.itchio !== undefined ? data.socials.itchio : user.socials?.itchio || '',
      github: data.socials.github !== undefined ? data.socials.github : user.socials?.github || ''
    };
  }

  await user.save();
  return toUserMe(user);
}

export async function updateAvatar(userId, file) {
  if (!file) {
    throw ApiError.badRequest('Please choose an image');
  }

  const { url, key } = await saveFile(file.buffer, {
    folder: 'avatars',
    visibility: 'public',
    originalName: file.originalname,
    mimeType: file.mimetype
  });

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const oldAvatarKey = user.avatarKey;

  user.avatarUrl = url;
  user.avatarKey = key;
  await user.save();

  if (oldAvatarKey) {
    await deleteFile(oldAvatarKey, { visibility: 'public' });
  }

  return toUserMe(user);
}

export async function updatePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  if (newPassword === currentPassword) {
    throw ApiError.badRequest('New password must be different from current password');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.tokenVersion += 1;
  await user.save();
}

export async function becomeCreator(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  if (user.role === 'buyer') {
    user.role = 'creator';
    await user.save();
  }

  return toUserMe(user);
}

export async function getWishlist(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const wishlistIds = user.wishlist || [];
  if (wishlistIds.length === 0) {
    return [];
  }

  const assets = await Asset.find({
    _id: { $in: wishlistIds },
    status: 'published'
  })
    .select(ASSET_CARD_SELECT)
    .populate(CREATOR_POPULATE);

  const assetMap = new Map(assets.map((asset) => [asset._id.toString(), asset]));

  // Preserve wishlist order: most recently added first (reverse of user.wishlist array)
  const orderedAssets = [...wishlistIds]
    .reverse()
    .map((id) => assetMap.get(id.toString()))
    .filter(Boolean);

  return orderedAssets.map((asset) => toAssetCard(asset));
}

export async function addToWishlist(userId, assetId) {
  const asset = await Asset.findOne({ _id: assetId, status: 'published' });
  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  const result = await User.updateOne(
    { _id: userId },
    { $addToSet: { wishlist: asset._id } }
  );

  if (result.modifiedCount === 1) {
    await Asset.updateOne(
      { _id: asset._id },
      { $inc: { 'stats.wishlistCount': 1 } }
    );
  }

  const user = await User.findById(userId).select('wishlist');
  const wishlist = (user.wishlist || []).map((id) => id.toString());
  return { wishlist };
}

export async function removeFromWishlist(userId, assetId) {
  const result = await User.updateOne(
    { _id: userId },
    { $pull: { wishlist: assetId } }
  );

  if (result.modifiedCount === 1) {
    await Asset.updateOne(
      { _id: assetId, 'stats.wishlistCount': { $gt: 0 } },
      { $inc: { 'stats.wishlistCount': -1 } }
    );
  }

  const user = await User.findById(userId).select('wishlist');
  const wishlist = (user.wishlist || []).map((id) => id.toString());
  return { wishlist };
}

export async function getUserPublicProfile(username) {
  const normalizedUsername = username.toLowerCase().trim();
  const user = await User.findOne({
    username: normalizedUsername,
    isBanned: false
  });

  if (!user) {
    throw ApiError.notFound('Creator not found');
  }

  const [statsResult] = await Asset.aggregate([
    {
      $match: {
        creator: user._id,
        status: 'published'
      }
    },
    {
      $group: {
        _id: null,
        assetCount: { $sum: 1 },
        totalSales: { $sum: '$stats.sales' },
        totalDownloads: { $sum: '$stats.downloads' },
        ratedAssetsCount: {
          $sum: {
            $cond: [{ $gt: ['$stats.ratingCount', 0] }, 1, 0]
          }
        },
        ratingSum: {
          $sum: {
            $cond: [{ $gt: ['$stats.ratingCount', 0] }, '$stats.ratingAvg', 0]
          }
        }
      }
    }
  ]);

  const assetCount = statsResult?.assetCount || 0;
  const totalSales = statsResult?.totalSales || 0;
  const totalDownloads = statsResult?.totalDownloads || 0;
  let avgRating = 0;

  if (statsResult && statsResult.ratedAssetsCount > 0) {
    avgRating = Math.round((statsResult.ratingSum / statsResult.ratedAssetsCount) * 10) / 10;
  }

  return {
    user: toUserPublic(user),
    stats: {
      assetCount,
      totalSales,
      totalDownloads,
      avgRating
    }
  };
}
