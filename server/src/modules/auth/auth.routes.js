import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { protect } from '../../middleware/auth.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { register, login, refresh, logout } from './auth.controller.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);

export default router;
