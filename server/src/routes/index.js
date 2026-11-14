import { Router } from 'express';
import mongoose from 'mongoose';
import { ok } from '../utils/response.js';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import assetsRoutes from '../modules/assets/assets.routes.js';
import reviewsRoutes from '../modules/reviews/reviews.routes.js';
import cartRoutes from '../modules/cart/cart.routes.js';
import ordersRoutes from '../modules/orders/orders.routes.js';
import paymentsRoutes from '../modules/payments/payments.routes.js';
import libraryRoutes from '../modules/library/library.routes.js';
import downloadsRoutes from '../modules/downloads/downloads.routes.js';
import creatorRoutes from '../modules/creator/creator.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  return ok(res, {
    status: 'ok',
    time: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    db: isConnected ? 'connected' : 'disconnected'
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/assets', assetsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/library', libraryRoutes);
router.use('/downloads', downloadsRoutes);
router.use('/creator', creatorRoutes);
router.use('/admin', adminRoutes);

export default router;
