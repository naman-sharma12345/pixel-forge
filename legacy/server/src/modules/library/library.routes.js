import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as libraryController from './library.controller.js';
import { claimSchema, getLibrarySchema } from './library.validation.js';

const router = Router();

router.use(protect);

router.get('/', validate(getLibrarySchema), libraryController.getLibrary);
router.post(
  '/claim/:assetId',
  validate(claimSchema),
  libraryController.claimAsset
);

export default router;
