import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as paymentsController from './payments.controller.js';
import { confirmSchema } from './payments.validation.js';

const router = Router();

router.use(protect);

router.post('/mock/confirm', validate(confirmSchema), paymentsController.mockConfirm);

export default router;
