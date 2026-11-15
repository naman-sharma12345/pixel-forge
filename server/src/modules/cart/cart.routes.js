import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as cartController from './cart.controller.js';
import { addItemSchema, removeItemSchema } from './cart.validation.js';

const router = Router();

router.use(protect);

router.get('/', cartController.getCart);
router.post('/items', validate(addItemSchema), cartController.addItem);
router.delete('/items/:assetId', validate(removeItemSchema), cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;
