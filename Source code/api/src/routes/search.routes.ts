import { Router } from 'express';
import {
  searchProducts,
  getProductStats,
  searchEvents,
  getEventStats,
} from '../controllers/search.controller';

const router = Router();

// All search routes are public
router.get('/products', searchProducts);
router.get('/products/stats', getProductStats);
router.get('/events', searchEvents);
router.get('/events/stats', getEventStats);

export default router;
