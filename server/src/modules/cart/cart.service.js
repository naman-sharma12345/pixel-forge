import Cart from '../../models/Cart.js';
import Asset from '../../models/Asset.js';
import { ApiError } from '../../utils/ApiError.js';
import { userOwnsAsset } from '../../utils/ownership.js';
import {
  toAssetCard,
  ASSET_CARD_SELECT,
  CREATOR_POPULATE,
} from '../assets/assets.serializers.js';

export const buildCartView = async (cart) => {
  await cart.populate({
    path: 'items.asset',
    select: ASSET_CARD_SELECT,
    populate: CREATOR_POPULATE,
  });

  const originalLength = cart.items.length;
  const validItems = cart.items.filter(
    (item) => item.asset && item.asset.status === 'published'
  );

  if (validItems.length !== originalLength) {
    cart.items = validItems;
    await cart.save();
  }

  const sortedItems = [...validItems].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  const items = sortedItems.map((item) => ({
    asset: toAssetCard(item.asset),
    addedAt: item.addedAt,
  }));

  const subtotal = items.reduce((sum, item) => sum + (item.asset.price || 0), 0);
  const count = items.length;

  return {
    items,
    subtotal,
    count,
  };
};

export const getCart = async (user) => {
  const userId = user._id || user;
  const cart = await Cart.getOrCreate(userId);
  return buildCartView(cart);
};

export const addItem = async (user, assetId) => {
  const userIdStr = (user._id || user).toString();

  const asset = await Asset.findById(assetId);
  if (!asset || asset.status !== 'published') {
    throw ApiError.notFound('Asset not found');
  }

  const creatorIdStr = (asset.creator._id || asset.creator).toString();
  if (creatorIdStr === userIdStr) {
    throw ApiError.badRequest('This is your own asset');
  }

  if (asset.price === 0) {
    throw ApiError.badRequest('Free assets are claimed, not bought');
  }

  const owns = await userOwnsAsset(userIdStr, assetId);
  if (owns) {
    throw ApiError.conflict('You already own this asset', 'ALREADY_OWNED');
  }

  const cart = await Cart.getOrCreate(userIdStr);
  const alreadyInCart = cart.items.some(
    (item) => item.asset && item.asset.toString() === assetId.toString()
  );
  if (alreadyInCart) {
    return buildCartView(cart);
  }

  if (cart.items.length >= 50) {
    throw ApiError.badRequest('Cart cannot contain more than 50 items');
  }

  await Cart.updateOne(
    {
      user: userIdStr,
      'items.asset': { $ne: assetId },
    },
    {
      $push: {
        items: {
          asset: assetId,
          addedAt: new Date(),
        },
      },
    }
  );

  const freshCart = await Cart.findOne({ user: userIdStr });
  return buildCartView(freshCart);
};

export const removeItem = async (user, assetId) => {
  const userIdStr = (user._id || user).toString();
  const cart = await Cart.findOneAndUpdate(
    { user: userIdStr },
    { $pull: { items: { asset: assetId } } },
    { new: true }
  );
  const currentCart = cart || (await Cart.getOrCreate(userIdStr));
  return buildCartView(currentCart);
};

export const clearCart = async (user) => {
  const userIdStr = (user._id || user).toString();
  const cart = await Cart.findOneAndUpdate(
    { user: userIdStr },
    { $set: { items: [] } },
    { new: true }
  );
  const currentCart = cart || (await Cart.getOrCreate(userIdStr));
  return buildCartView(currentCart);
};

export const removeAssetsFromCart = async (userId, assetIds) => {
  if (!assetIds || assetIds.length === 0) {
    return;
  }
  const userIdStr = (userId._id || userId).toString();
  await Cart.updateOne(
    { user: userIdStr },
    { $pull: { items: { asset: { $in: assetIds } } } }
  );
};

export default {
  buildCartView,
  getCart,
  addItem,
  removeItem,
  clearCart,
  removeAssetsFromCart,
};
