// STUB created by Abhishek - Adwait replaces this file
import Purchase from '../models/Purchase.js';

export async function userOwnsAsset(userId, assetId) {
  if (!userId || !assetId) return false;
  const purchase = await Purchase.findOne({ user: userId, asset: assetId }).lean();
  return Boolean(purchase);
}

export async function getOwnedAssetIds(userId) {
  if (!userId) return new Set();
  const purchases = await Purchase.find({ user: userId }).select('asset').lean();
  const idSet = new Set(purchases.map((p) => p.asset.toString()));
  return idSet;
}
