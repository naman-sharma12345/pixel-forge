import fs from 'fs';
import jwt from 'jsonwebtoken';
import Asset from '../../models/Asset.js';
import Purchase from '../../models/Purchase.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { userOwnsAsset } from '../../utils/ownership.js';
import {
  createDownloadLink,
  resolvePrivatePath,
} from '../../utils/storage.js';

export const getDownloadLink = async (user, assetId) => {
  const userIdStr = (user._id || user).toString();

  const asset = await Asset.findById(assetId).select('+file title');
  if (!asset) {
    throw ApiError.notFound('Asset not found');
  }

  const isCreator =
    (asset.creator._id || asset.creator).toString() === userIdStr;
  const isAdmin = user.role === 'admin';
  const isOwner = await userOwnsAsset(userIdStr, asset._id);

  if (!isCreator && !isAdmin && !isOwner) {
    throw ApiError.forbidden('Buy or claim this asset to download it');
  }

  const fileName =
    (asset.fileInfo && asset.fileInfo.originalName) ||
    (asset.file && asset.file.originalName) ||
    `${asset.slug || 'download'}.zip`;

  if (!asset.file || !asset.file.key) {
    throw ApiError.notFound('Asset file not found');
  }

  const { url, expiresAt } = createDownloadLink({
    key: asset.file.key,
    fileName,
    userId: userIdStr,
    expiresInSec: 300,
  });

  if (isOwner && !isCreator) {
    await Purchase.updateOne(
      { user: userIdStr, asset: asset._id },
      {
        $inc: { downloadCount: 1 },
        $set: { lastDownloadedAt: new Date() },
      }
    );
  }

  if (!isCreator) {
    await Asset.updateOne(
      { _id: asset._id },
      { $inc: { 'stats.downloads': 1 } }
    );
  }

  return {
    url,
    expiresAt,
    fileName,
  };
};

export const resolveDownloadFile = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      audience: 'download',
    });
  } catch (err) {
    throw ApiError.unauthorized('This download link has expired');
  }

  const filePath = resolvePrivatePath(payload.key);
  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('File not found');
  }

  return {
    filePath,
    fileName: payload.fileName,
  };
};

export default {
  getDownloadLink,
  resolveDownloadFile,
};
