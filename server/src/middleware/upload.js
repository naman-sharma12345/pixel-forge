import path from 'path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'];
const ALLOWED_PREVIEW_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_AUDIO_MIMES];

const ALLOWED_PRODUCT_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'psd', 'aseprite', 'ase',
  'zip', '7z', 'rar', 'wav', 'mp3', 'ogg', 'flac', 'ttf', 'otf', 'woff',
  'woff2', 'glb', 'gltf', 'fbx', 'obj', 'blend', 'tmx', 'tsx', 'json',
  'txt', 'pdf'
];

export const uploadAssetFiles = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB per file
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new ApiError(415, 'UNSUPPORTED_FILE', `File type not allowed for ${file.fieldname}: ${file.originalname}`));
    }

    if (file.fieldname === 'previews') {
      if (ALLOWED_PREVIEW_MIMES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new ApiError(415, 'UNSUPPORTED_FILE', `File type not allowed for ${file.fieldname}: ${file.originalname}`));
    }

    if (file.fieldname === 'file') {
      const ext = path.extname(file.originalname).slice(1).toLowerCase();
      if (ALLOWED_PRODUCT_EXTENSIONS.includes(ext)) {
        return cb(null, true);
      }
      return cb(new ApiError(415, 'UNSUPPORTED_FILE', `File type not allowed for ${file.fieldname}: ${file.originalname}`));
    }

    return cb(new ApiError(415, 'UNSUPPORTED_FILE', `Unexpected field ${file.fieldname}`));
  }
}).fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'previews', maxCount: 6 },
  { name: 'file', maxCount: 1 }
]);

export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new ApiError(415, 'UNSUPPORTED_FILE', 'Only image files are allowed for avatar'));
  }
}).single('avatar');
