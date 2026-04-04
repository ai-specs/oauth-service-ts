import { Router } from 'express';
import { authorize, token, introspect, revoke } from '../controllers/oauthController';
import { tokenRateLimiter, introspectRateLimiter } from '../middleware/security';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// OAuth endpoints
router.get('/authorize', asyncHandler(authorize));
router.post('/token', tokenRateLimiter, asyncHandler(token));
router.post('/introspect', introspectRateLimiter, asyncHandler(introspect));
router.post('/revoke', asyncHandler(revoke));

export default router;