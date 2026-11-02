import { Router } from 'express';
import { listServiceTypes } from './serviceType.controller';

const router = Router();
router.get('/', listServiceTypes);

export { router as serviceTypeRoutes };
