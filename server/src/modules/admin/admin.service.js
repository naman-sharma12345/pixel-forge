import User from '../../models/User.js';
import Asset from '../../models/Asset.js';
import Order from '../../models/Order.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  fillDailySeries,
  getKolkataStartOfDay,
} from '../creator/creator.utils.js';
import { toUserPublic } from '../users/users.serializers.js';
import {
  toAssetCard,
  toAssetCardWithStatus,
  ASSET_CARD_SELECT,
  CREATOR_POPULATE,
} from '../assets/assets.serializers.js';
import { clearAssetCache } from '../assets/assets.service.js';
import { getPagination, buildMeta } from '../../utils/pagination.js';

const escapeRegex = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const toAdminUser = (userDoc) => {
  const publicUser = toUserPublic(userDoc);
  return {
    ...publicUser,
    email: userDoc.email,
    isBanned: userDoc.isBanned,
  };
};

const mapAssetWithStatus = (assetDoc) => {
  if (typeof toAssetCardWithStatus === 'function') {
    return toAssetCardWithStatus(assetDoc);
  }
  return {
    ...toAssetCard(assetDoc),
    status: assetDoc.status,
    rejectionReason: assetDoc.rejectionReason,
  };
};

export const getAdminStats = async () => {
  const since = getKolkataStartOfDay(30 - 1);

  const [
    usersCount,
    creatorsCount,
    assetsCount,
    ordersCount,
    orderTotals,
    userSignups,
    orderRevenues,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'creator' }),
    Asset.countDocuments({ status: 'published' }),
    Order.countDocuments({ status: 'paid' }),
    Order.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          platformFees: { $sum: '$platformFee' },
        },
      },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Asia/Kolkata',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$paidAt',
              timezone: 'Asia/Kolkata',
            },
          },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const revenue = orderTotals[0]?.revenue || 0;
  const platformFees = orderTotals[0]?.platformFees || 0;

  const signupsSeries = fillDailySeries(userSignups, 30, ['count']);
  const revenueSeries = fillDailySeries(orderRevenues, 30, ['revenue']);

  return {
    users: usersCount,
    creators: creatorsCount,
    assets: assetsCount,
    orders: ordersCount,
    revenue,
    platformFees,
    signupsSeries,
    revenueSeries,
  };
};

export const getUsers = async (query = {}) => {
  const { q, role, banned, page, limit } = query;
  const { page: pageNum, limit: limitNum, skip } = getPagination({ page, limit });

  const filter = {};
  if (role) {
    filter.role = role;
  }
  if (banned !== undefined && banned !== '') {
    if (banned === 'true' || banned === true) {
      filter.isBanned = true;
    } else if (banned === 'false' || banned === false) {
      filter.isBanned = false;
    }
  }
  if (q && q.trim()) {
    const escaped = escapeRegex(q.trim());
    const reg = new RegExp(escaped, 'i');
    filter.$or = [{ name: reg }, { username: reg }, { email: reg }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(toAdminUser),
    meta: buildMeta(pageNum, limitNum, total),
  };
};

export const updateUser = async (adminUser, id, updateData) => {
  const adminIdStr = (adminUser._id || adminUser).toString();
  if (adminIdStr === id.toString()) {
    throw ApiError.badRequest('You cannot change your own account here');
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  const update = {};
  if (updateData.role !== undefined) {
    update.role = updateData.role;
  }
  if (updateData.isBanned !== undefined) {
    update.isBanned = updateData.isBanned;
    if (updateData.isBanned === true) {
      update.$inc = { tokenVersion: 1 };
    }
  }

  const updatedUser = await User.findByIdAndUpdate(id, update, { new: true });
  return toAdminUser(updatedUser);
};

export const getAssets = async (query = {}) => {
  const { status, q, page, limit } = query;
  const { page: pageNum, limit: limitNum, skip } = getPagination({ page, limit });

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (q && q.trim()) {
    filter.title = new RegExp(escapeRegex(q.trim()), 'i');
  }

  const [assets, total] = await Promise.all([
    Asset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select(ASSET_CARD_SELECT + ' status rejectionReason')
      .populate(CREATOR_POPULATE),
    Asset.countDocuments(filter),
  ]);

  return {
    assets: assets.map(mapAssetWithStatus),
    meta: buildMeta(pageNum, limitNum, total),
  };
};

export const updateAsset = async (id, updateData) => {
  const update = {};
  if (updateData.status !== undefined) {
    update.status = updateData.status;
    if (updateData.status === 'published') {
      update.rejectionReason = '';
    }
  }
  if (updateData.isFeatured !== undefined) {
    update.isFeatured = updateData.isFeatured;
  }
  if (updateData.rejectionReason !== undefined) {
    update.rejectionReason = updateData.rejectionReason;
  }

  const asset = await Asset.findByIdAndUpdate(id, update, { new: true })
    .select(ASSET_CARD_SELECT + ' status rejectionReason')
    .populate(CREATOR_POPULATE);

  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  if (typeof clearAssetCache === 'function') {
    clearAssetCache();
  }

  return mapAssetWithStatus(asset);
};

export default {
  toAdminUser,
  getAdminStats,
  getUsers,
  updateUser,
  getAssets,
  updateAsset,
};
