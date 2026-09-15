import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import productRoutes from './product.routes';
import traceEventRoutes from './traceEvent.routes';
import farmingAreaRoutes from './farmingArea.routes';
import uploadRoutes from './upload.routes';
import certificationRoutes from './certification.routes';
import exportRoutes from './export.routes';
import notificationRoutes from './notification.routes';
import adminRoutes from './admin.routes';
import searchRoutes from './search.routes';
import auditLogRoutes from './auditLog.routes';
<<<<<<< HEAD
import publicRoutes from './public.routes';
import qualityInspectionRoutes from './qualityInspection.routes';
import diseaseDetectionRoutes from './diseaseDetection.routes';
import supplyChainRoutes from './supplyChain.routes';
=======
import blockchainRoutes from './blockchain.routes';
>>>>>>> dan/main

const router = Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/trace', traceEventRoutes);
router.use('/farming-areas', farmingAreaRoutes);
router.use('/upload', uploadRoutes);
router.use('/certifications', certificationRoutes);
router.use('/export', exportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/search', searchRoutes);
router.use('/audit-logs', auditLogRoutes);
<<<<<<< HEAD
router.use('/quality-inspections', qualityInspectionRoutes);
router.use('/disease-detections', diseaseDetectionRoutes);
router.use('/supply-chain', supplyChainRoutes);
=======
router.use('/blockchain', blockchainRoutes);
>>>>>>> dan/main

export default router;
