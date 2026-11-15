import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { uploadAvatar } from '../../middleware/upload.js';
import {
  updateProfileSchema,
  updatePasswordSchema,
  assetIdParamsSchema,
  usernameParamsSchema
} from './users.validation.js';
import {
  getMe,
  updateProfile,
  updateAvatar,
  updatePassword,
  becomeCreator,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getUserPublicProfile
} from './users.controller.js';

const router = Router();

// All /me routes must precede /:username
router.get('/me', protect, getMe);
router.patch('/me', protect, validate({ body: updateProfileSchema }), updateProfile);
router.post('/me/avatar', protect, uploadAvatar, updateAvatar);
router.patch('/me/password', protect, validate({ body: updatePasswordSchema }), updatePassword);
router.post('/me/become-creator', protect, becomeCreator);

router.get('/me/wishlist', protect, getWishlist);
router.post('/me/wishlist/:assetId', protect, validate({ params: assetIdParamsSchema }), addToWishlist);
router.delete('/me/wishlist/:assetId', protect, validate({ params: assetIdParamsSchema }), removeFromWishlist);

// Public profile
router.get('/:username', validate({ params: usernameParamsSchema }), getUserPublicProfile);

export default router;
