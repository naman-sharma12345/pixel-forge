import Purchase from '../models/Purchase.js';

export const userOwnsAsset = async (userId, assetId) => {
  if (!userId || !assetId) {
    return false;
  }
  return Boolean(await Purchase.exists({ user: userId, asset: assetId }));
};

export const getOwnedAssetIds = async (userId) => {
  if (!userId) {
    return new Set();
  }
  const purchases = await Purchase.find({ user: userId }).select('asset').lean();
  return new Set(purchases.map((p) => p.asset.toString()));
};

export default {
  userOwnsAsset,
  getOwnedAssetIds,
};
