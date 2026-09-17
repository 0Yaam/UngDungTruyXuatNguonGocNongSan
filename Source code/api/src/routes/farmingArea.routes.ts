import { Router } from 'express';
import {
  getAllFarmingAreas,
  getFarmingArea,
  getMyFarmingAreas,
  createFarmingArea,
  updateFarmingArea,
  deleteFarmingArea,
} from '../controllers/farmingArea.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllFarmingAreas);

// Authenticated routes - specific routes before parameterized routes
router.get('/my/areas', authenticate, getMyFarmingAreas);

// Public route with parameter
router.get('/:id', getFarmingArea);

// Protected routes
router.use(authenticate);
router.post('/', authorize('admin', 'manager', 'farmer'), createFarmingArea);
router.patch('/:id', authorize('admin', 'manager', 'farmer'), updateFarmingArea);
router.delete('/:id', authorize('admin'), deleteFarmingArea);

export default router;
