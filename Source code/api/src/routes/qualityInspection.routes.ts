import { Router } from 'express';
import * as controller from '../controllers/qualityInspection.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditCreate, auditDelete, auditUpdate } from '../middlewares/audit.middleware';

const router = Router();

router.get('/', controller.getAll);
router.get('/my/inspections', authenticate, controller.getMine);
router.get('/product/:productId', controller.getByProduct);
router.get('/:id', controller.getById);

router.use(authenticate);
router.post(
  '/',
  authorize('admin', 'manager'),
  auditCreate('QualityInspection', (_req, body: any) => body?.inspection?._id),
  controller.create
);
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  auditUpdate('QualityInspection'),
  controller.update
);
router.delete(
  '/:id',
  authorize('admin'),
  auditDelete('QualityInspection'),
  controller.remove
);

export default router;
