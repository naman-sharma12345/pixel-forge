import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as creatorController from './creator.controller.js';
import {
  statsQuerySchema,
  salesQuerySchema,
} from './creator.validation.js';

const router = Router();

router.use(protect, authorize('creator', 'admin'));

router.get(
  '/stats',
  validate(statsQuerySchema),
  creatorController.getCreatorStats
);
router.get(
  '/sales',
  validate(salesQuerySchema),
  creatorController.getCreatorSales
);

export default router;
