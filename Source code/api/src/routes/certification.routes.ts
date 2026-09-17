import { Router } from 'express';
import {
  getAllCertifications,
  getCertification,
  getCertificationsByHolder,
  getCertificationsByFarmingArea,
  createCertification,
  updateCertification,
  deleteCertification,
  checkExpiredCertifications,
} from '../controllers/certification.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllCertifications);
router.get('/holder/:userId', getCertificationsByHolder);
router.get('/farming-area/:areaId', getCertificationsByFarmingArea);
router.get('/:id', getCertification);

// Protected routes
router.use(authenticate);
router.post('/', authorize('admin', 'manager'), createCertification);
router.post(
  '/check-expired',
  authorize('admin'),
  checkExpiredCertifications
);
router.patch('/:id', authorize('admin', 'manager'), updateCertification);
router.delete('/:id', authorize('admin'), deleteCertification);

export default router;
