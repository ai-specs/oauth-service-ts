import { Router } from 'express';
import { registerClient, getClient, removeClient } from '../controllers/clientController';
import { validateBody } from '../middleware/validation';
import { CreateClientSchema } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Client management endpoints
router.post('/', validateBody(CreateClientSchema), registerClient);
router.get('/:id', getClient);
router.delete('/:id', removeClient);

// Validate UUID parameter
const uuidSchema = z.object({
  id: z.string().uuid(),
});

export { uuidSchema };
export default router;