import { Router } from 'express';
import { authorize, token, introspect, revoke } from '../controllers/oauthController';
import { tokenRateLimiter, introspectRateLimiter } from '../middleware/security';

const router = Router();

// OAuth endpoints
router.get('/authorize', authorize);
router.post('/token', tokenRateLimiter, token);
router.post('/introspect', introspectRateLimiter, introspect);
router.post('/revoke', revoke);

export default router;