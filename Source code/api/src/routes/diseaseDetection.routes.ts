import { Router } from 'express';
import { uploadDiseaseImages } from '../config/upload';
import * as controller from '../controllers/diseaseDetection.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditCreate, auditDelete } from '../middlewares/audit.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'manager', 'farmer'));
router.get('/capabilities', controller.getCapabilities);
router.get('/', controller.getAll);
router.get('/product/:productId', controller.getByProduct);
router.post(
  '/',
  authorize('admin', 'manager', 'farmer'),
  uploadDiseaseImages,
  auditCreate('DiseaseDetection', (_req, body: any) => body?.detection?._id),
  controller.create
);
router.delete(
  '/:id',
  authorize('admin', 'manager', 'farmer'),
  auditDelete('DiseaseDetection'),
  controller.remove
);

export default router;
