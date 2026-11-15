import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as adminController from './admin.controller.js';
import {
  getUsersSchema,
  updateUserSchema,
  getAssetsSchema,
  updateAssetSchema,
} from './admin.validation.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/stats', adminController.getAdminStats);
router.get('/users', validate(getUsersSchema), adminController.getUsers);
router.patch(
  '/users/:id',
  validate(updateUserSchema),
  adminController.updateUser
);
router.get('/assets', validate(getAssetsSchema), adminController.getAssets);
router.patch(
  '/assets/:id',
  validate(updateAssetSchema),
  adminController.updateAsset
);

export default router;
