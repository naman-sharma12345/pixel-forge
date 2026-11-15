import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as downloadsController from './downloads.controller.js';
import {
  getDownloadLinkSchema,
  downloadFileSchema,
} from './downloads.validation.js';

const router = Router();

// Public route: token contains permissions and expiration
router.get(
  '/file/:token',
  validate(downloadFileSchema),
  downloadsController.downloadFile
);

// Protected route: user must own asset, be creator, or admin
router.get(
  '/:assetId',
  protect,
  validate(getDownloadLinkSchema),
  downloadsController.getDownloadLink
);

export default router;
