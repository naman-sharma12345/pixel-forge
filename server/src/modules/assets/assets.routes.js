import { Router } from 'express';
import { protect, optionalAuth, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { uploadAssetFiles } from '../../middleware/upload.js';
import * as assetsController from './assets.controller.js';
import {
  listAssetsQuerySchema,
  listMineQuerySchema,
  slugParamSchema,
  idParamSchema,
  createAssetBodySchema,
  updateAssetBodySchema,
} from './assets.validation.js';

const router = Router();

router.get(
  '/',
  optionalAuth,
  validate({ query: listAssetsQuerySchema }),
  assetsController.listAssets
);

router.get('/home', assetsController.getHomeAssets);

router.get('/categories', assetsController.getCategories);

router.get('/tags', assetsController.getTags);

router.get(
  '/mine',
  protect,
  authorize('creator', 'admin'),
  validate({ query: listMineQuerySchema }),
  assetsController.getMyAssets
);

router.get(
  '/:slug',
  optionalAuth,
  validate({ params: slugParamSchema }),
  assetsController.getAssetBySlug
);

router.get(
  '/:slug/related',
  validate({ params: slugParamSchema }),
  assetsController.getRelatedAssets
);

router.post(
  '/',
  protect,
  authorize('creator', 'admin'),
  uploadAssetFiles,
  validate({ body: createAssetBodySchema }),
  assetsController.createAsset
);

router.patch(
  '/:id',
  protect,
  uploadAssetFiles,
  validate({ params: idParamSchema, body: updateAssetBodySchema }),
  assetsController.updateAsset
);

router.delete(
  '/:id',
  protect,
  validate({ params: idParamSchema }),
  assetsController.deleteAsset
);

export default router;
