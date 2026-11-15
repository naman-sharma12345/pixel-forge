import Order from '../../models/Order.js';
import Cart from '../../models/Cart.js';
import Asset from '../../models/Asset.js';
import Purchase from '../../models/Purchase.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { nanoid } from 'nanoid';
import { getOwnedAssetIds } from '../../utils/ownership.js';
import { removeAssetsFromCart } from '../cart/cart.service.js';
import { clearAssetCache } from '../assets/assets.service.js';
import { getPagination, buildMeta } from '../../utils/pagination.js';

export const toOrderView = (order) => ({
  _id: order._id,
  items: order.items,
  subtotal: order.subtotal,
  platformFee: order.platformFee,
  total: order.total,
  currency: order.currency,
  status: order.status,
  provider: order.provider,
  paidAt: order.paidAt,
  createdAt: order.createdAt,
});

export const checkout = async (user, { assetIds } = {}) => {
  const userIdStr = (user._id || user).toString();

  let targetIds = [];
  if (Array.isArray(assetIds)) {
    targetIds = [...new Set(assetIds.map((id) => id.toString()))];
  } else {
    const cart = await Cart.findOne({ user: userIdStr });
    if (cart && Array.isArray(cart.items)) {
      targetIds = cart.items.map((item) => (item.asset._id || item.asset).toString());
    }
  }

  if (targetIds.length === 0) {
    throw ApiError.badRequest('Your cart is empty');
  }

  const assets = await Asset.find({
    _id: { $in: targetIds },
    status: 'published',
  });

  const ownedSet = await getOwnedAssetIds(userIdStr);

  const buyableAssets = assets.filter((asset) => {
    const isMine = (asset.creator._id || asset.creator).toString() === userIdStr;
    const isOwned = ownedSet.has(asset._id.toString());
    const isPaid = asset.price > 0;
    return !isMine && !isOwned && isPaid;
  });

  if (buyableAssets.length === 0) {
    throw ApiError.badRequest(
      'Nothing to buy: the selected assets are free, yours, or already owned'
    );
  }

  const feePct = env.PLATFORM_FEE_PERCENT ?? 10;
  const items = buyableAssets.map((asset) => {
    const fee = Math.round((asset.price * feePct) / 100);
    const creatorEarning = asset.price - fee;
    return {
      asset: asset._id,
      title: asset.title,
      price: asset.price,
      creator: asset.creator,
      license: asset.license,
      creatorEarning,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const platformFee = items.reduce(
    (sum, item) => sum + (item.price - item.creatorEarning),
    0
  );
  const total = subtotal;

  const providerOrderId = 'mock_' + nanoid(14);

  const order = await Order.create({
    user: userIdStr,
    items,
    subtotal,
    platformFee,
    total,
    currency: 'INR',
    status: 'created',
    provider: 'mock',
    providerOrderId,
  });

  return {
    order: toOrderView(order),
    payment: {
      provider: 'mock',
      providerOrderId,
    },
  };
};

export const fulfillOrder = async (orderId, providerPaymentId) => {
  let order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'created' },
    { status: 'paid', paidAt: new Date(), providerPaymentId },
    { new: true }
  );

  if (!order) {
    const existing = await Order.findById(orderId);
    if (existing && existing.status === 'paid') {
      const purchasedAssetIds = existing.items.map((i) =>
        (i.asset._id || i.asset).toString()
      );
      return {
        order: toOrderView(existing),
        purchasedAssetIds,
      };
    }
    throw new ApiError(402, 'PAYMENT_FAILED', 'Payment failed or order not found');
  }

  const purchases = order.items.map((item) => ({
    user: order.user,
    asset: item.asset,
    order: order._id,
    pricePaid: item.price,
    downloadCount: 0,
    lastDownloadedAt: null,
  }));

  try {
    await Purchase.insertMany(purchases, { ordered: false });
  } catch (err) {
    const isDup =
      err.code === 11000 ||
      (err.writeErrors && err.writeErrors.every((e) => e.code === 11000));
    if (!isDup) {
      throw err;
    }
  }

  const purchasedAssetIds = order.items.map((item) =>
    (item.asset._id || item.asset).toString()
  );

  if (purchasedAssetIds.length > 0) {
    const bulkOps = purchasedAssetIds.map((assetId) => ({
      updateOne: {
        filter: { _id: assetId },
        update: { $inc: { 'stats.sales': 1 } },
      },
    }));
    await Asset.bulkWrite(bulkOps);
  }

  await removeAssetsFromCart(order.user, purchasedAssetIds);

  if (typeof clearAssetCache === 'function') {
    clearAssetCache();
  }

  return {
    order: toOrderView(order),
    purchasedAssetIds,
  };
};

export const markFailed = async (orderId) => {
  await Order.findOneAndUpdate(
    { _id: orderId, status: 'created' },
    { status: 'failed' }
  );
};

export const listMyOrders = async (user, page, limit) => {
  const userIdStr = (user._id || user).toString();
  const { page: pageNum, limit: limitNum, skip } = getPagination({ page, limit });

  const [orders, total] = await Promise.all([
    Order.find({ user: userIdStr })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments({ user: userIdStr }),
  ]);

  return {
    orders: orders.map(toOrderView),
    meta: buildMeta(pageNum, limitNum, total),
  };
};

export const getOrder = async (user, id) => {
  const userIdStr = (user._id || user).toString();
  const order = await Order.findById(id);

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const isOwner = order.user.toString() === userIdStr;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.notFound('Order not found');
  }

  return toOrderView(order);
};

export default {
  toOrderView,
  checkout,
  fulfillOrder,
  markFailed,
  listMyOrders,
  getOrder,
};
