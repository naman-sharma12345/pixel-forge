import asyncHandler from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as reviewsService from './reviews.service.js';

export const listReviews = asyncHandler(async (req, res) => {
  const result = await reviewsService.listReviews(req.query);
  return ok(res, result.data, { meta: result.meta });
});

export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.createReview({
    currentUser: req.user,
    data: req.body,
  });
  return created(res, review);
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.updateReview({
    id: req.params.id,
    currentUser: req.user,
    data: req.body,
  });
  return ok(res, review);
});

export const deleteReview = asyncHandler(async (req, res) => {
  await reviewsService.deleteReview({
    id: req.params.id,
    currentUser: req.user,
  });
  return ok(res, null);
});
