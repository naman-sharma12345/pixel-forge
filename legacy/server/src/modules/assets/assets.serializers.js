export const ASSET_CARD_SELECT =
  '_id slug title category mediaKind thumbnail previews price license tags isFeatured stats.sales stats.downloads stats.ratingAvg stats.ratingCount creator createdAt';

export const CREATOR_POPULATE = {
  path: 'creator',
  select: 'username name avatarUrl',
};

export function toAssetCard(assetDoc) {
  if (!assetDoc) return null;
  const doc = typeof assetDoc.toObject === 'function' ? assetDoc.toObject() : assetDoc;

  let previewAudioUrl = null;
  if (Array.isArray(doc.previews)) {
    const audioPreview = doc.previews.find((p) => p && p.kind === 'audio' && p.url);
    if (audioPreview) {
      previewAudioUrl = audioPreview.url;
    }
  }

  let creatorObj = {
    _id: '',
    username: '',
    name: '',
    avatarUrl: '',
  };

  if (doc.creator) {
    if (typeof doc.creator === 'object' && doc.creator !== null) {
      creatorObj = {
        _id: doc.creator._id ? doc.creator._id.toString() : doc.creator.toString(),
        username: doc.creator.username || '',
        name: doc.creator.name || '',
        avatarUrl: doc.creator.avatarUrl || '',
      };
    } else {
      creatorObj = {
        _id: doc.creator.toString(),
        username: '',
        name: '',
        avatarUrl: '',
      };
    }
  }

  const price = typeof doc.price === 'number' ? doc.price : 0;

  return {
    _id: doc._id ? doc._id.toString() : '',
    slug: doc.slug || '',
    title: doc.title || '',
    category: doc.category || '',
    mediaKind: doc.mediaKind || 'image',
    thumbnail: {
      url: doc.thumbnail?.url || '',
    },
    previewAudioUrl,
    price,
    isFree: price === 0,
    license: doc.license || 'standard',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    isFeatured: Boolean(doc.isFeatured),
    stats: {
      sales: doc.stats?.sales ?? 0,
      downloads: doc.stats?.downloads ?? 0,
      ratingAvg: doc.stats?.ratingAvg ?? 0,
      ratingCount: doc.stats?.ratingCount ?? 0,
    },
    creator: creatorObj,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function toAssetDetail(assetDoc, { isOwned = false, inWishlist = false, isMine = false } = {}) {
  if (!assetDoc) return null;
  const card = toAssetCard(assetDoc);
  const doc = typeof assetDoc.toObject === 'function' ? assetDoc.toObject() : assetDoc;

  const previews = Array.isArray(doc.previews)
    ? doc.previews.map((p) => ({
        url: p.url || '',
        kind: p.kind || 'image',
      }))
    : [];

  const meta = doc.meta
    ? {
        ...(doc.meta.resolution !== undefined && { resolution: doc.meta.resolution }),
        ...(doc.meta.frames !== undefined && { frames: doc.meta.frames }),
        ...(doc.meta.durationSec !== undefined && { durationSec: doc.meta.durationSec }),
        ...(doc.meta.bpm !== undefined && { bpm: doc.meta.bpm }),
        ...(doc.meta.loopable !== undefined && { loopable: doc.meta.loopable }),
        ...(doc.meta.sampleRate !== undefined && { sampleRate: doc.meta.sampleRate }),
      }
    : {};

  const fileInfo = {
    format: doc.fileInfo?.format || '',
    bytes: doc.fileInfo?.bytes ?? 0,
    originalName: doc.fileInfo?.originalName || '',
  };

  return {
    ...card,
    description: doc.description || '',
    previews,
    fileFormats: Array.isArray(doc.fileFormats) ? doc.fileFormats : [],
    meta,
    fileInfo,
    status: doc.status || 'published',
    rejectionReason: doc.rejectionReason || '',
    stats: {
      views: doc.stats?.views ?? 0,
      downloads: doc.stats?.downloads ?? 0,
      sales: doc.stats?.sales ?? 0,
      ratingAvg: doc.stats?.ratingAvg ?? 0,
      ratingCount: doc.stats?.ratingCount ?? 0,
      wishlistCount: doc.stats?.wishlistCount ?? 0,
    },
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    isOwned: Boolean(isOwned),
    inWishlist: Boolean(inWishlist),
    isMine: Boolean(isMine),
  };
}

export function toAssetCardWithStatus(assetDoc) {
  if (!assetDoc) return null;
  const card = toAssetCard(assetDoc);
  const doc = typeof assetDoc.toObject === 'function' ? assetDoc.toObject() : assetDoc;

  return {
    ...card,
    status: doc.status || 'published',
    rejectionReason: doc.rejectionReason || '',
  };
}
