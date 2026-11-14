import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../../');

export function getUploadDir() {
  if (path.isAbsolute(env.UPLOAD_DIR)) {
    return env.UPLOAD_DIR;
  }
  return path.resolve(serverRoot, env.UPLOAD_DIR);
}

export async function ensureUploadDirs() {
  const root = getUploadDir();
  const dirs = [
    path.join(root, 'public', 'avatars'),
    path.join(root, 'public', 'thumbnails'),
    path.join(root, 'public', 'previews'),
    path.join(root, 'private', 'files')
  ];

  for (const dir of dirs) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

export async function saveFile(buffer, { folder, visibility = 'public', originalName = '', mimeType = '' } = {}) {
  const extMatch = originalName ? path.extname(originalName) : '';
  const rawExt = extMatch ? extMatch.slice(1).toLowerCase() : (mimeType ? mimeType.split('/')[1] || 'bin' : 'bin');
  const baseName = originalName ? path.parse(originalName).name : '';
  const slugName = slugify(baseName, { lower: true, strict: true }) || 'file';
  const key = `${folder}/${Date.now()}-${nanoid(8)}-${slugName}.${rawExt}`;

  const root = getUploadDir();
  const filePath = path.resolve(root, visibility, key);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, buffer);

  const url = visibility === 'public' ? `${env.SERVER_URL}/uploads/${key}` : '';

  return {
    url,
    key,
    format: rawExt,
    mimeType,
    bytes: buffer.length
  };
}

export async function deleteFile(key, { visibility = 'public' } = {}) {
  if (!key) return;
  try {
    const root = getUploadDir();
    const filePath = path.resolve(root, visibility, key);
    await fs.promises.unlink(filePath);
  } catch (err) {
    console.warn(`deleteFile warning for key ${key}: ${err.message}`);
  }
}

export function createDownloadLink({ key, fileName, userId, expiresInSec = 300 }) {
  const token = jwt.sign(
    { key, fileName, sub: userId },
    env.JWT_ACCESS_SECRET,
    { audience: 'download', expiresIn: expiresInSec }
  );

  return {
    url: `${env.SERVER_URL}/api/downloads/file/${token}`,
    expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString()
  };
}

export function resolvePrivatePath(key) {
  if (!key || typeof key !== 'string') {
    throw ApiError.badRequest('Invalid file key');
  }

  const root = getUploadDir();
  const privateRoot = path.resolve(root, 'private');
  const targetPath = path.resolve(privateRoot, key);

  if (!targetPath.startsWith(privateRoot + path.sep) && targetPath !== privateRoot) {
    throw ApiError.badRequest('Path traversal detected');
  }

  return targetPath;
}
