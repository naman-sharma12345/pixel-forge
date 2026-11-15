import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ordersController from './orders.controller.js';
import { checkoutSchema, getOrderSchema } from './orders.validation.js';

const router = Router();

router.use(protect);

router.post('/checkout', validate(checkoutSchema), ordersController.checkout);
router.get('/', ordersController.listMyOrders);
router.get('/:id', validate(getOrderSchema), ordersController.getOrder);

export default router;
