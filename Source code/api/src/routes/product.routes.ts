import { Router } from 'express';
import {
  getAllProducts,
  getMyProducts,
  getProduct,
  getTrashProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  updateProductCameras,
  deleteProduct,
  restoreProduct,
  permanentlyDeleteProduct,
} from '../controllers/product.controller';
import {
  adjustInventory,
  getInventoryByProduct,
  mergeProducts,
  recallProduct,
  splitProduct,
} from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditCreate, auditDelete, auditUpdate } from '../middlewares/audit.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getAllProducts);
router.get('/my/products', getMyProducts);
router.get('/trash', authorize('admin', 'manager'), getTrashProducts);
router.post(
  '/',
  authorize('admin', 'manager', 'farmer'),
  auditCreate('Product', (_req, body: any) => body?.product?._id?.toString()),
  createProduct
);
router.patch(
  '/:id/cameras',
  authorize('admin', 'manager', 'farmer'),
  auditUpdate('Product'),
  updateProductCameras
);
router.patch(
  '/:id/status',
  authorize('admin', 'manager', 'farmer'),
  auditUpdate('Product'),
  updateProductStatus
);
router.get(
  '/:id/inventory',
  authorize('admin', 'manager', 'farmer'),
  getInventoryByProduct
);
router.post(
  '/:id/inventory/adjust',
  authorize('admin', 'manager', 'farmer'),
  auditCreate('InventoryTransaction', (_req, body: any) => body?.transaction?._id?.toString()),
  adjustInventory
);
router.post(
  '/:id/split',
  authorize('admin', 'manager', 'farmer'),
  auditCreate('InventoryTransaction', (_req, body: any) => body?.transaction?._id?.toString()),
  splitProduct
);
router.post(
  '/merge',
  authorize('admin', 'manager', 'farmer'),
  auditCreate('InventoryTransaction', (_req, body: any) => body?.transaction?._id?.toString()),
  mergeProducts
);
router.post(
  '/:id/recall',
  authorize('admin', 'manager', 'farmer'),
  auditCreate('InventoryTransaction', (_req, body: any) => body?.transaction?._id?.toString()),
  recallProduct
);
router.post(
  '/:id/restore',
  authorize('admin', 'manager'),
  auditUpdate('Product'),
  restoreProduct
);
router.delete(
  '/:id/permanent',
  authorize('admin'),
  auditDelete('Product'),
  permanentlyDeleteProduct
);
router.get('/:id', getProduct);
router.patch(
  '/:id',
  authorize('admin', 'manager', 'farmer'),
  auditUpdate('Product'),
  updateProduct
);
router.delete(
  '/:id',
  authorize('admin'),
  auditDelete('Product'),
  deleteProduct
);

export default router;
