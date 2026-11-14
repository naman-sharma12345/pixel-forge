import mongoose from 'mongoose';
import Review from '../../models/Review.js';
import Asset from '../../models/Asset.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildMeta } from '../../utils/pagination.js';
import { userOwnsAsset } from '../../utils/ownership.js';
import { toReview } from './reviews.serializers.js';

export async function recomputeAssetRating(assetId) {
  const assetObjectId = new mongoose.Types.ObjectId(assetId);
  const stats = await Review.aggregate([
    { $match: { asset: assetObjectId } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingAvg = stats.length > 0 ? Math.round(stats[0].avg * 10) / 10 : 0;
  const ratingCount = stats.length > 0 ? stats[0].count : 0;

  await Asset.updateOne(
    { _id: assetObjectId },
    { $set: { 'stats.ratingAvg': ratingAvg, 'stats.ratingCount': ratingCount } }
  );
}

export async function listReviews(query) {
  const assetObjectId = new mongoose.Types.ObjectId(query.asset);

  const assetExists = await Asset.exists({ _id: assetObjectId });
  if (!assetExists) {
    throw ApiError.notFound('Asset not found');
  }

  const { page, limit, skip } = getPagination(query);

  const [statsAggregation, total, reviews] = await Promise.all([
    Review.aggregate([
      { $match: { asset: assetObjectId } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]),
    Review.countDocuments({ asset: assetObjectId }),
    Review.find({ asset: assetObjectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'user', select: 'username name avatarUrl' }),
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  for (const stat of statsAggregation) {
    const ratingKey = stat._id;
    const count = stat.count;
    if (distribution[ratingKey] !== undefined) {
      distribution[ratingKey] = count;
    }
    ratingSum += ratingKey * count;
  }

  const avg = total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0;

  return {
    data: {
      reviews: reviews.map(toReview),
      summary: {
        avg,
        count: total,
        distribution,
      },
    },
    meta: buildMeta(page, limit, total),
  };
}

export async function createReview({ currentUser, data }) {
  const asset = await Asset.findById(data.assetId);
  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  const isCreator = asset.creator.toString() === currentUser._id.toString();
  if (isCreator) {
    throw ApiError.forbidden('Creators cannot review their own assets');
  }

  const owns = await userOwnsAsset(currentUser._id, asset._id);
  if (!owns) {
    throw ApiError.forbidden('You must own the asset to review it');
  }

  const existingReview = await Review.findOne({
    asset: asset._id,
    user: currentUser._id,
  });
  if (existingReview) {
    throw ApiError.conflict('You have already reviewed this asset');
  }

  const review = new Review({
    asset: asset._id,
    user: currentUser._id,
    rating: data.rating,
    comment: data.comment || '',
  });

  await review.save();
  await review.populate({ path: 'user', select: 'username name avatarUrl' });

  await recomputeAssetRating(asset._id);

  return toReview(review);
}

export async function updateReview({ id, currentUser, data }) {
  const review = await Review.findById(id);
  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  if (review.user.toString() !== currentUser._id.toString()) {
    throw ApiError.forbidden('You can only edit your own reviews');
  }

  if (data.rating !== undefined) {
    review.rating = data.rating;
  }
  if (data.comment !== undefined) {
    review.comment = data.comment;
  }

  await review.save();
  await review.populate({ path: 'user', select: 'username name avatarUrl' });

  await recomputeAssetRating(review.asset);

  return toReview(review);
}

export async function deleteReview({ id, currentUser }) {
  const review = await Review.findById(id);
  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  const isAdmin = currentUser.role === 'admin';
  const isAuthor = review.user.toString() === currentUser._id.toString();

  if (!isAdmin && !isAuthor) {
    throw ApiError.forbidden('You do not have permission to delete this review');
  }

  const assetId = review.asset;
  await Review.deleteOne({ _id: review._id });

  await recomputeAssetRating(assetId);

  return null;
}
