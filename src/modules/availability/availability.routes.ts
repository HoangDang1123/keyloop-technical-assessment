import { Router } from 'express';
import { checkAvailability } from './availability.controller';
import { validate } from '../../middleware/validate';
import { availabilityQuerySchema } from './availability.schema';

const router = Router();
router.get('/', validate(availabilityQuerySchema, 'query'), checkAvailability);

export { router as availabilityRoutes };
