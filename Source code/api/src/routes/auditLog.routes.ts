import { Router } from 'express';
import {
  getLogs,
  getLogsByEntity,
  getLogsByUser,
} from '../controllers/auditLog.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / - list logs (admin only) with pagination
router.get('/', authorize('admin'), getLogs);

// GET /entity/:entity/:entityId - logs for specific entity (admin, manager)
router.get(
  '/entity/:entity/:entityId',
  authorize('admin', 'manager'),
  getLogsByEntity
);

// GET /user/:userId - logs by user (admin only)
router.get('/user/:userId', authorize('admin'), getLogsByUser);

export default router;
