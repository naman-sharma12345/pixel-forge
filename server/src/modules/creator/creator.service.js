import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Asset from '../../models/Asset.js';
import {
  fillDailySeries,
  getKolkataStartOfDay,
} from './creator.utils.js';
import {
  toAssetCard,
  ASSET_CARD_SELECT,
  CREATOR_POPULATE,
} from '../assets/assets.serializers.js';
import { getPagination, buildMeta } from '../../utils/pagination.js';

export const getCreatorStats = async (user, range = '30d') => {
  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[range] || 30;
  const since = getKolkataStartOfDay(days - 1);
  const creatorObjectId = new mongoose.Types.ObjectId(user._id);

  const [earningsFacet] = await Order.aggregate([
    {
      $match: {
        status: 'paid',
        paidAt: { $gte: since },
        'items.creator': creatorObjectId,
      },
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.creator': creatorObjectId,
      },
    },
    {
      $facet: {
        series: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$paidAt',
                  timezone: 'Asia/Kolkata',
                },
              },
              revenue: { $sum: '$items.creatorEarning' },
              sales: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        totals: [
          {
            $group: {
              _id: null,
              revenue: { $sum: '$items.creatorEarning' },
              sales: { $sum: 1 },
            },
          },
        ],
        top: [
          {
            $group: {
              _id: '$items.asset',
              revenue: { $sum: '$items.creatorEarning' },
              sales: { $sum: 1 },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
        ],
        byCategory: [
          {
            $lookup: {
              from: 'assets',
              localField: 'items.asset',
              foreignField: '_id',
              as: 'assetDoc',
            },
          },
          { $unwind: '$assetDoc' },
          {
            $group: {
              _id: '$assetDoc.category',
              sales: { $sum: 1 },
              revenue: { $sum: '$items.creatorEarning' },
            },
          },
        ],
      },
    },
  ]);

  const [assetAgg] = await Asset.aggregate([
    {
      $match: {
        creator: creatorObjectId,
        status: { $ne: 'archived' },
      },
    },
    {
      $group: {
        _id: null,
        assets: { $sum: 1 },
        views: { $sum: '$stats.views' },
        downloads: { $sum: '$stats.downloads' },
        wishlists: { $sum: '$stats.wishlistCount' },
        ratings: {
          $push: {
            $cond: [
              { $gt: ['$stats.ratingCount', 0] },
              '$stats.ratingAvg',
              '$$REMOVE',
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        assets: 1,
        views: 1,
        downloads: 1,
        wishlists: 1,
        avgRating: {
          $cond: [
            { $gt: [{ $size: '$ratings' }, 0] },
            { $round: [{ $avg: '$ratings' }, 1] },
            0,
          ],
        },
      },
    },
  ]);

  const revenue = earningsFacet?.totals[0]?.revenue || 0;
  const sales = earningsFacet?.totals[0]?.sales || 0;
  const downloads = assetAgg?.downloads || 0;
  const views = assetAgg?.views || 0;
  const assets = assetAgg?.assets || 0;
  const avgRating = assetAgg?.avgRating || 0;
  const wishlists = assetAgg?.wishlists || 0;

  const totals = {
    revenue,
    sales,
    downloads,
    views,
    assets,
    avgRating,
    wishlists,
  };

  const series = fillDailySeries(
    earningsFacet?.series || [],
    days,
    ['revenue', 'sales']
  );

  const topRows = earningsFacet?.top || [];
  const topAssetIds = topRows.map((t) => t._id);
  const assetDocs = await Asset.find({ _id: { $in: topAssetIds } })
    .select(ASSET_CARD_SELECT)
    .populate(CREATOR_POPULATE);

  const docMap = new Map(assetDocs.map((a) => [a._id.toString(), a]));
  const topAssets = topRows
    .map((t) => {
      const doc = docMap.get(t._id.toString());
      if (!doc) return null;
      return {
        asset: toAssetCard(doc),
        revenue: t.revenue,
        sales: t.sales,
      };
    })
    .filter(Boolean);

  const categoryBreakdown = (earningsFacet?.byCategory || []).map((c) => ({
    category: c._id,
    sales: c.sales,
    revenue: c.revenue,
  }));

  return {
    totals,
    series,
    topAssets,
    categoryBreakdown,
  };
};

export const getCreatorSales = async (user, page, limit) => {
  const creatorObjectId = new mongoose.Types.ObjectId(user._id);
  const { page: pageNum, limit: limitNum, skip } = getPagination({ page, limit });

  const [result] = await Order.aggregate([
    {
      $match: {
        status: 'paid',
        'items.creator': creatorObjectId,
      },
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.creator': creatorObjectId,
      },
    },
    { $sort: { paidAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: 'assets',
              localField: 'items.asset',
              foreignField: '_id',
              as: 'assetDoc',
            },
          },
          { $unwind: { path: '$assetDoc', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'buyerDoc',
            },
          },
          { $unwind: { path: '$buyerDoc', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              orderId: '$_id',
              asset: {
                _id: '$assetDoc._id',
                title: '$assetDoc.title',
                slug: '$assetDoc.slug',
                thumbnail: '$assetDoc.thumbnail',
              },
              buyer: {
                username: '$buyerDoc.username',
                avatarUrl: '$buyerDoc.avatarUrl',
              },
              price: '$items.price',
              creatorEarning: '$items.creatorEarning',
              paidAt: '$paidAt',
            },
          },
        ],
      },
    },
  ]);

  const total = result?.metadata[0]?.total || 0;
  const sales = result?.data || [];

  return {
    sales,
    meta: buildMeta(pageNum, limitNum, total),
  };
};

export default {
  getCreatorStats,
  getCreatorSales,
};
