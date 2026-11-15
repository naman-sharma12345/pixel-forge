import slugify from 'slugify';
import { nanoid } from 'nanoid';
import Asset from '../../models/Asset.js';
import User from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPagination, buildMeta } from '../../utils/pagination.js';
import { saveFile, deleteFile } from '../../utils/storage.js';
import { userOwnsAsset } from '../../utils/ownership.js';
import {
  toAssetCard,
  toAssetDetail,
  toAssetCardWithStatus,
  ASSET_CARD_SELECT,
  CREATOR_POPULATE,
} from './assets.serializers.js';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  MEDIA_KIND_BY_CATEGORY,
} from '../../constants.js';

export async function listAssets(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { status: 'published' };

  if (query.q) {
    filter.$text = { $search: query.q.trim() };
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.tags) {
    const tagList = (
      typeof query.tags === 'string' ? query.tags.split(',') : query.tags
    )
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (tagList.length > 0) {
      filter.tags = { $all: tagList };
    }
  }

  if (query.free === 'true' || query.free === true) {
    filter.price = 0;
  } else if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined && query.minPrice !== null && query.minPrice !== '') {
      filter.price.$gte = Number(query.minPrice);
    }
    if (query.maxPrice !== undefined && query.maxPrice !== null && query.maxPrice !== '') {
      filter.price.$lte = Number(query.maxPrice);
    }
    if (Object.keys(filter.price).length === 0) {
      delete filter.price;
    }
  }

  if (query.license) {
    filter.license = query.license;
  }

  if (query.mediaKind) {
    filter.mediaKind = query.mediaKind;
  }

  if (query.creator) {
    const creatorUser = await User.findOne({
      username: query.creator.trim().toLowerCase(),
    }).select('_id');

    if (!creatorUser) {
      return {
        items: [],
        meta: buildMeta(page, limit, 0),
      };
    }
    filter.creator = creatorUser._id;
  }

  let sortOptions = {};
  let projection = null;

  switch (query.sort) {
    case 'relevance':
      if (!query.q) {
        throw ApiError.badRequest("Sort by 'relevance' requires query 'q'");
      }
      projection = { score: { $meta: 'textScore' } };
      sortOptions = { score: { $meta: 'textScore' } };
      break;
    case 'popular':
      sortOptions = { 'stats.sales': -1, createdAt: -1 };
      break;
    case 'top-rated':
      sortOptions = { 'stats.ratingAvg': -1, 'stats.ratingCount': -1, createdAt: -1 };
      break;
    case 'price-asc':
      sortOptions = { price: 1, createdAt: -1 };
      break;
    case 'price-desc':
      sortOptions = { price: -1, createdAt: -1 };
      break;
    case 'newest':
    default:
      sortOptions = { createdAt: -1 };
      break;
  }

  let queryBuilder = Asset.find(filter);

  if (projection) {
    queryBuilder = queryBuilder.select({ ...projection }).sort(sortOptions);
  } else {
    queryBuilder = queryBuilder.sort(sortOptions);
  }

  const [total, assets] = await Promise.all([
    Asset.countDocuments(filter),
    queryBuilder
      .select(ASSET_CARD_SELECT)
      .populate(CREATOR_POPULATE)
      .skip(skip)
      .limit(limit),
  ]);

  return {
    items: assets.map(toAssetCard),
    meta: buildMeta(page, limit, total),
  };
}

export async function getHomeAssets() {
  const [featuredDocs, trendingDocs, newestDocs, freebiesDocs, audioDocs] =
    await Promise.all([
      Asset.find({ status: 'published', isFeatured: true })
        .select(ASSET_CARD_SELECT)
        .populate(CREATOR_POPULATE)
        .sort({ createdAt: -1 })
        .limit(8),

      Asset.find({ status: 'published' })
        .select(ASSET_CARD_SELECT)
        .populate(CREATOR_POPULATE)
        .sort({ 'stats.sales': -1, 'stats.views': -1, createdAt: -1 })
        .limit(8),

      Asset.find({ status: 'published' })
        .select(ASSET_CARD_SELECT)
        .populate(CREATOR_POPULATE)
        .sort({ createdAt: -1 })
        .limit(8),

      Asset.find({ status: 'published', price: 0 })
        .select(ASSET_CARD_SELECT)
        .populate(CREATOR_POPULATE)
        .sort({ 'stats.downloads': -1, createdAt: -1 })
        .limit(8),

      Asset.find({ status: 'published', mediaKind: 'audio' })
        .select(ASSET_CARD_SELECT)
        .populate(CREATOR_POPULATE)
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

  return {
    featured: featuredDocs.map(toAssetCard),
    trending: trendingDocs.map(toAssetCard),
    newest: newestDocs.map(toAssetCard),
    freebies: freebiesDocs.map(toAssetCard),
    audio: audioDocs.map(toAssetCard),
  };
}

export async function getCategories() {
  const counts = await Asset.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const countMap = new Map();
  for (const item of counts) {
    countMap.set(item._id, item.count);
  }

  return CATEGORIES.map((catKey) => ({
    key: catKey,
    label: CATEGORY_LABELS[catKey] || catKey,
    count: countMap.get(catKey) || 0,
    mediaKind: MEDIA_KIND_BY_CATEGORY[catKey] || 'image',
  }));
}

export async function getTopTags() {
  const results = await Asset.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 30 },
    { $project: { _id: 0, tag: '$_id', count: 1 } },
  ]);

  return results;
}

export async function getMyAssets({ userId, query }) {
  const { page, limit, skip } = getPagination(query);
  const filter = { creator: userId };

  if (query.status) {
    filter.status = query.status;
  }

  const [total, assets] = await Promise.all([
    Asset.countDocuments(filter),
    Asset.find(filter)
      .select(`${ASSET_CARD_SELECT} status rejectionReason`)
      .populate(CREATOR_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  return {
    items: assets.map(toAssetCardWithStatus),
    meta: buildMeta(page, limit, total),
  };
}

export async function getAssetBySlug({ slug, currentUser }) {
  const asset = await Asset.findOne({ slug: slug.toLowerCase() }).populate(
    CREATOR_POPULATE
  );

  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  if (asset.status !== 'published') {
    const isAdmin = currentUser?.role === 'admin';
    const creatorId = asset.creator?._id
      ? asset.creator._id.toString()
      : asset.creator?.toString();
    const isCreator =
      currentUser && creatorId && creatorId === currentUser._id.toString();

    if (!isAdmin && !isCreator) {
      throw ApiError.notFound('Asset not found');
    }
  }

  await Asset.updateOne({ _id: asset._id }, { $inc: { 'stats.views': 1 } });
  asset.stats.views = (asset.stats.views || 0) + 1;

  const creatorId = asset.creator?._id
    ? asset.creator._id.toString()
    : asset.creator?.toString();
  const isMine = Boolean(
    currentUser && creatorId && creatorId === currentUser._id.toString()
  );

  let isOwned = false;
  if (currentUser) {
    isOwned = await userOwnsAsset(currentUser._id, asset._id);
  }

  let inWishlist = false;
  if (currentUser && Array.isArray(currentUser.wishlist)) {
    inWishlist = currentUser.wishlist.some(
      (w) => w.toString() === asset._id.toString()
    );
  }

  return toAssetDetail(asset, { isOwned, inWishlist, isMine });
}

export async function getRelatedAssets({ slug }) {
  const asset = await Asset.findOne({ slug: slug.toLowerCase() }).select(
    '_id category tags'
  );

  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  let related = await Asset.find({
    _id: { $ne: asset._id },
    status: 'published',
    category: asset.category,
  })
    .select(ASSET_CARD_SELECT)
    .populate(CREATOR_POPULATE)
    .sort({ 'stats.sales': -1, 'stats.ratingAvg': -1, createdAt: -1 })
    .limit(6);

  if (related.length < 6 && Array.isArray(asset.tags) && asset.tags.length > 0) {
    const existingIds = [asset._id, ...related.map((r) => r._id)];
    const remaining = 6 - related.length;

    const tagRelated = await Asset.find({
      _id: { $nin: existingIds },
      status: 'published',
      tags: { $in: asset.tags },
    })
      .select(ASSET_CARD_SELECT)
      .populate(CREATOR_POPULATE)
      .sort({ 'stats.sales': -1, 'stats.ratingAvg': -1, createdAt: -1 })
      .limit(remaining);

    related = [...related, ...tagRelated];
  }

  return related.map(toAssetCard);
}

export async function createAsset({ currentUser, data, files }) {
  const thumbnailFile = files?.thumbnail?.[0];
  if (!thumbnailFile) {
    throw ApiError.badRequest('Thumbnail file is required');
  }
  if (!thumbnailFile.mimetype?.startsWith('image/')) {
    throw ApiError.badRequest('Thumbnail must be an image file');
  }

  const mainFile = files?.file?.[0];
  if (!mainFile) {
    throw ApiError.badRequest('Main asset file is required');
  }

  const previewFiles = files?.previews || [];
  if (previewFiles.length > 6) {
    throw ApiError.badRequest('Maximum 6 preview files allowed');
  }

  const savedThumb = await saveFile(thumbnailFile.buffer, {
    folder: 'thumbnails',
    visibility: 'public',
    originalName: thumbnailFile.originalname,
    mimeType: thumbnailFile.mimetype,
  });

  const savedMain = await saveFile(mainFile.buffer, {
    folder: 'files',
    visibility: 'private',
    originalName: mainFile.originalname,
    mimeType: mainFile.mimetype,
  });

  const savedPreviews = [];
  for (const pFile of previewFiles) {
    const kind = pFile.mimetype?.startsWith('audio/') ? 'audio' : 'image';
    const saved = await saveFile(pFile.buffer, {
      folder: 'previews',
      visibility: 'public',
      originalName: pFile.originalname,
      mimeType: pFile.mimetype,
    });
    savedPreviews.push({
      url: saved.url,
      key: saved.key,
      kind,
    });
  }

  const baseSlug = slugify(data.title, { lower: true, strict: true }) || 'asset';
  const slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;

  const mediaKind =
    MEDIA_KIND_BY_CATEGORY[data.category] ||
    (['sfx', 'music'].includes(data.category)
      ? 'audio'
      : ['fonts', '3d'].includes(data.category)
      ? 'other'
      : 'image');

  const fileExt = (
    mainFile.originalname.split('.').pop() ||
    savedMain.format ||
    ''
  ).toLowerCase();
  const fileFormat = (savedMain.format || fileExt).toLowerCase();
  const fileBytes =
    typeof savedMain.bytes === 'number' ? savedMain.bytes : mainFile.size;

  const asset = new Asset({
    title: data.title,
    slug,
    description: data.description,
    creator: currentUser._id,
    category: data.category,
    mediaKind,
    tags: data.tags || [],
    price: data.price !== undefined ? data.price : 0,
    license: data.license || 'standard',
    fileFormats: data.fileFormats || [],
    meta: data.meta || {},
    thumbnail: {
      url: savedThumb.url,
      key: savedThumb.key,
    },
    previews: savedPreviews,
    file: {
      key: savedMain.key,
      format: fileFormat,
      mimeType: savedMain.mimeType || mainFile.mimetype,
      bytes: fileBytes,
      originalName: mainFile.originalname,
    },
    fileInfo: {
      format: fileFormat,
      bytes: fileBytes,
      originalName: mainFile.originalname,
    },
    status: 'published',
    rejectionReason: '',
    isFeatured: false,
    stats: {
      views: 0,
      downloads: 0,
      sales: 0,
      ratingAvg: 0,
      ratingCount: 0,
      wishlistCount: 0,
    },
  });

  await asset.save();
  await asset.populate(CREATOR_POPULATE);

  return toAssetDetail(asset, {
    isOwned: true,
    inWishlist: false,
    isMine: true,
  });
}

export async function updateAsset({ id, currentUser, data, files }) {
  const asset = await Asset.findById(id).select('+file');
  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  const isAdmin = currentUser.role === 'admin';
  const isCreator = asset.creator.toString() === currentUser._id.toString();

  if (!isAdmin && !isCreator) {
    throw ApiError.forbidden('You do not have permission to update this asset');
  }

  const newThumb = files?.thumbnail?.[0];
  if (newThumb) {
    if (!newThumb.mimetype?.startsWith('image/')) {
      throw ApiError.badRequest('Thumbnail must be an image file');
    }
    const savedThumb = await saveFile(newThumb.buffer, {
      folder: 'thumbnails',
      visibility: 'public',
      originalName: newThumb.originalname,
      mimeType: newThumb.mimetype,
    });
    if (asset.thumbnail?.key) {
      await deleteFile(asset.thumbnail.key, { visibility: 'public' });
    }
    asset.thumbnail = {
      url: savedThumb.url,
      key: savedThumb.key,
    };
  }

  const newFile = files?.file?.[0];
  if (newFile) {
    const savedFile = await saveFile(newFile.buffer, {
      folder: 'files',
      visibility: 'private',
      originalName: newFile.originalname,
      mimeType: newFile.mimetype,
    });
    if (asset.file?.key) {
      await deleteFile(asset.file.key, { visibility: 'private' });
    }
    const fileExt = (
      newFile.originalname.split('.').pop() ||
      savedFile.format ||
      ''
    ).toLowerCase();
    const fileFormat = (savedFile.format || fileExt).toLowerCase();
    const fileBytes =
      typeof savedFile.bytes === 'number' ? savedFile.bytes : newFile.size;

    asset.file = {
      key: savedFile.key,
      format: fileFormat,
      mimeType: savedFile.mimeType || newFile.mimetype,
      bytes: fileBytes,
      originalName: newFile.originalname,
    };
    asset.fileInfo = {
      format: fileFormat,
      bytes: fileBytes,
      originalName: newFile.originalname,
    };
  }

  const newPreviews = files?.previews;
  if (Array.isArray(newPreviews) && newPreviews.length > 0) {
    if (newPreviews.length > 6) {
      throw ApiError.badRequest('Maximum 6 preview files allowed');
    }
    if (Array.isArray(asset.previews)) {
      for (const p of asset.previews) {
        if (p.key) {
          await deleteFile(p.key, { visibility: 'public' });
        }
      }
    }

    const savedPreviews = [];
    for (const pFile of newPreviews) {
      const kind = pFile.mimetype?.startsWith('audio/') ? 'audio' : 'image';
      const saved = await saveFile(pFile.buffer, {
        folder: 'previews',
        visibility: 'public',
        originalName: pFile.originalname,
        mimeType: pFile.mimetype,
      });
      savedPreviews.push({
        url: saved.url,
        key: saved.key,
        kind,
      });
    }
    asset.previews = savedPreviews;
  }

  if (data.title !== undefined) {
    asset.title = data.title;
  }
  if (data.description !== undefined) {
    asset.description = data.description;
  }
  if (data.category !== undefined) {
    asset.category = data.category;
    asset.mediaKind =
      MEDIA_KIND_BY_CATEGORY[data.category] ||
      (['sfx', 'music'].includes(data.category)
        ? 'audio'
        : ['fonts', '3d'].includes(data.category)
        ? 'other'
        : 'image');
  }
  if (data.tags !== undefined) {
    asset.tags = data.tags;
  }
  if (data.price !== undefined) {
    asset.price = data.price;
  }
  if (data.license !== undefined) {
    asset.license = data.license;
  }
  if (data.fileFormats !== undefined) {
    asset.fileFormats = data.fileFormats;
  }
  if (data.meta !== undefined) {
    const currentMeta =
      asset.meta && typeof asset.meta.toObject === 'function'
        ? asset.meta.toObject()
        : asset.meta || {};
    asset.meta = { ...currentMeta, ...data.meta };
  }

  await asset.save();
  await asset.populate(CREATOR_POPULATE);

  const creatorId = asset.creator?._id
    ? asset.creator._id.toString()
    : asset.creator?.toString();
  const isMine = Boolean(
    currentUser && creatorId && creatorId === currentUser._id.toString()
  );
  const isOwned = await userOwnsAsset(currentUser._id, asset._id);
  const inWishlist =
    currentUser && Array.isArray(currentUser.wishlist)
      ? currentUser.wishlist.some((w) => w.toString() === asset._id.toString())
      : false;

  return toAssetDetail(asset, { isOwned, inWishlist, isMine });
}

export async function archiveAsset({ id, currentUser }) {
  const asset = await Asset.findById(id);
  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  const isAdmin = currentUser.role === 'admin';
  const isCreator = asset.creator.toString() === currentUser._id.toString();

  if (!isAdmin && !isCreator) {
    throw ApiError.forbidden('You do not have permission to delete this asset');
  }

  asset.status = 'archived';
  await asset.save();

  return null;
}
