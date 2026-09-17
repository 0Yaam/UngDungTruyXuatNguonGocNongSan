import { Router } from 'express';
import {
  createTraceEvent,
  getEventsByProduct,
  getFullTrace,
  verifyTraceEvent,
  retryTraceEvent,
} from '../controllers/traceEvent.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditCreate, auditMiddleware } from '../middlewares/audit.middleware';

const router = Router();

router.get('/verify/:eventId', verifyTraceEvent);

router.use(authenticate);
router.get('/events/product/:productId', getEventsByProduct);
router.post(
  '/events',
  authorize('admin', 'manager', 'farmer'),
  auditCreate('TraceEvent', (_req, body: any) =>
    body?.traceEvent?._id?.toString()
  ),
  createTraceEvent
);
router.post(
  '/events/:eventId/retry',
  authorize('admin', 'manager', 'farmer'),
  auditMiddleware({
    action: 'RETRY',
    entity: 'TraceEvent',
    getEntityId: (req) => req.params.eventId,
  }),
  retryTraceEvent
);
router.get('/:productId', getFullTrace);

export default router;
