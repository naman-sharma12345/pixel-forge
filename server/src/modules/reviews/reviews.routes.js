import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as reviewsController from './reviews.controller.js';
import {
  listReviewsQuerySchema,
  createReviewBodySchema,
  updateReviewBodySchema,
  reviewIdParamSchema,
} from './reviews.validation.js';

const router = Router();

router.get(
  '/',
  validate({ query: listReviewsQuerySchema }),
  reviewsController.listReviews
);

router.post(
  '/',
  protect,
  validate({ body: createReviewBodySchema }),
  reviewsController.createReview
);

router.patch(
  '/:id',
  protect,
  validate({ params: reviewIdParamSchema, body: updateReviewBodySchema }),
  reviewsController.updateReview
);

router.delete(
  '/:id',
  protect,
  validate({ params: reviewIdParamSchema }),
  reviewsController.deleteReview
);

export default router;
