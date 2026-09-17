import { Router } from 'express';
import { getPublicTrace } from '../controllers/publicTrace.controller';

const router = Router();

router.get('/trace/:productId', getPublicTrace);

export default router;
