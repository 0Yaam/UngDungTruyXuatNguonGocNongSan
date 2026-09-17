import { Router } from 'express';
import * as controller from '../controllers/supplyChain.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditCreate, auditDelete, auditUpdate } from '../middlewares/audit.middleware';

const router = Router();
router.get('/organizations', controller.getOrganizations);
router.get('/records', controller.getRecords);
router.get('/records/product/:productId', controller.getRecordsByProduct);
router.get('/lineage/:productId', controller.getProductLineage);

router.use(authenticate);
router.post('/organizations', authorize('admin', 'manager'), auditCreate('SupplyChainOrganization', (_req, body: any) => body?.organization?._id), controller.createOrganization);
router.patch('/organizations/:id', authorize('admin', 'manager'), auditUpdate('SupplyChainOrganization'), controller.updateOrganization);
router.delete('/organizations/:id', authorize('admin'), auditDelete('SupplyChainOrganization'), controller.deleteOrganization);
router.post('/records', authorize('admin', 'manager', 'farmer'), auditCreate('SupplyChainRecord', (_req, body: any) => body?.record?._id), controller.createRecord);
router.patch('/records/:id', authorize('admin', 'manager', 'farmer'), auditUpdate('SupplyChainRecord'), controller.updateRecord);
router.delete('/records/:id', authorize('admin'), auditDelete('SupplyChainRecord'), controller.deleteRecord);

export default router;
