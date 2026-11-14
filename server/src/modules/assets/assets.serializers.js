// STUB created by Abhishek - Parth replaces this file
export const ASSET_CARD_SELECT = 'title slug category mediaKind thumbnail previews price license tags isFeatured stats creator createdAt';

export const CREATOR_POPULATE = {
  path: 'creator',
  select: 'username name avatarUrl'
};

export function toAssetCard(assetDoc) {
  if (!assetDoc) return null;

  const doc = typeof assetDoc.toObject === 'function' ? assetDoc.toObject() : assetDoc;

  const audioPreview = Array.isArray(doc.previews)
    ? doc.previews.find((p) => p.kind === 'audio')
    : null;

  const creatorObj = doc.creator && typeof doc.creator === 'object' && doc.creator._id
    ? {
        _id: doc.creator._id.toString(),
        username: doc.creator.username || '',
        name: doc.creator.name || '',
        avatarUrl: doc.creator.avatarUrl || ''
      }
    : {
        _id: doc.creator ? doc.creator.toString() : '',
        username: '',
        name: '',
        avatarUrl: ''
      };

  return {
    _id: doc._id ? doc._id.toString() : doc.id,
    slug: doc.slug,
    title: doc.title,
    category: doc.category,
    mediaKind: doc.mediaKind,
    thumbnail: {
      url: doc.thumbnail?.url || ''
    },
    previewAudioUrl: audioPreview?.url || null,
    price: doc.price ?? 0,
    isFree: (doc.price ?? 0) === 0,
    license: doc.license || 'standard',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    isFeatured: Boolean(doc.isFeatured),
    stats: {
      sales: doc.stats?.sales ?? 0,
      downloads: doc.stats?.downloads ?? 0,
      ratingAvg: doc.stats?.ratingAvg ?? 0,
      ratingCount: doc.stats?.ratingCount ?? 0
    },
    creator: creatorObj,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : (doc.createdAt || new Date().toISOString())
  };
}

export function toAssetDetail(assetDoc, { isOwned = false, inWishlist = false, isMine = false } = {}) {
  if (!assetDoc) return null;

  const doc = typeof assetDoc.toObject === 'function' ? assetDoc.toObject() : assetDoc;
  const card = toAssetCard(doc);

  return {
    ...card,
    description: doc.description || '',
    previews: Array.isArray(doc.previews)
      ? doc.previews.map((p) => ({ url: p.url, kind: p.kind }))
      : [],
    fileFormats: Array.isArray(doc.fileFormats) ? doc.fileFormats : [],
    meta: doc.meta || {},
    fileInfo: {
      format: doc.fileInfo?.format || '',
      bytes: doc.fileInfo?.bytes ?? 0,
      originalName: doc.fileInfo?.originalName || ''
    },
    status: doc.status || 'published',
    rejectionReason: doc.rejectionReason || '',
    stats: {
      views: doc.stats?.views ?? 0,
      downloads: doc.stats?.downloads ?? 0,
      sales: doc.stats?.sales ?? 0,
      ratingAvg: doc.stats?.ratingAvg ?? 0,
      ratingCount: doc.stats?.ratingCount ?? 0,
      wishlistCount: doc.stats?.wishlistCount ?? 0
    },
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : (doc.updatedAt || new Date().toISOString()),
    isOwned: Boolean(isOwned),
    inWishlist: Boolean(inWishlist),
    isMine: Boolean(isMine)
  };
}
