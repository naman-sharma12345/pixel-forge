import Purchase from '../../models/Purchase.js';
import Asset from '../../models/Asset.js';
import { ApiError } from '../../utils/ApiError.js';
import { userOwnsAsset } from '../../utils/ownership.js';
import {
  toAssetCard,
  ASSET_CARD_SELECT,
  CREATOR_POPULATE,
} from '../assets/assets.serializers.js';
import { getPagination, buildMeta } from '../../utils/pagination.js';

export const toLibraryItem = (purchase) => ({
  _id: purchase._id,
  asset: toAssetCard(purchase.asset),
  pricePaid: purchase.pricePaid,
  downloadCount: purchase.downloadCount,
  lastDownloadedAt: purchase.lastDownloadedAt,
  createdAt: purchase.createdAt,
});

export const getLibrary = async (user, query = {}) => {
  const userIdStr = (user._id || user).toString();
  const { q, category, page, limit } = query;

  const purchases = await Purchase.find({ user: userIdStr })
    .sort({ createdAt: -1 })
    .populate({
      path: 'asset',
      select: ASSET_CARD_SELECT,
      populate: CREATOR_POPULATE,
    });

  let validPurchases = purchases.filter((p) => p.asset);

  if (category) {
    validPurchases = validPurchases.filter(
      (p) => p.asset.category === category
    );
  }

  if (q && q.trim()) {
    const qLower = q.trim().toLowerCase();
    validPurchases = validPurchases.filter(
      (p) => p.asset.title && p.asset.title.toLowerCase().includes(qLower)
    );
  }

  const total = validPurchases.length;
  const { page: pageNum, limit: limitNum, skip } = getPagination({ page, limit });
  const paginatedPurchases = validPurchases.slice(skip, skip + limitNum);

  return {
    items: paginatedPurchases.map(toLibraryItem),
    meta: buildMeta(pageNum, limitNum, total),
  };
};

export const claimAsset = async (user, assetId) => {
  const userIdStr = (user._id || user).toString();

  const asset = await Asset.findById(assetId);
  if (!asset || asset.status !== 'published') {
    throw ApiError.notFound('Asset not found');
  }

  if (asset.price > 0) {
    throw ApiError.badRequest('This asset is not free');
  }

  const creatorIdStr = (asset.creator._id || asset.creator).toString();
  if (creatorIdStr === userIdStr) {
    throw ApiError.badRequest('You cannot claim your own asset');
  }

  const owned = await userOwnsAsset(userIdStr, assetId);
  if (owned) {
    throw ApiError.conflict('You already own this asset', 'ALREADY_OWNED');
  }

  const purchase = await Purchase.create({
    user: userIdStr,
    asset: asset._id,
    order: null,
    pricePaid: 0,
    downloadCount: 0,
    lastDownloadedAt: null,
  });

  await purchase.populate({
    path: 'asset',
    select: ASSET_CARD_SELECT,
    populate: CREATOR_POPULATE,
  });

  return toLibraryItem(purchase);
};

export default {
  toLibraryItem,
  getLibrary,
  claimAsset,
};
