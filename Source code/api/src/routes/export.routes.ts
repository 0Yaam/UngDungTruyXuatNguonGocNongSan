import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as exportController from '../controllers/export.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /export/product/:id/pdf - Download product trace PDF
router.get('/product/:id/pdf', exportController.exportProductPDF);

// GET /export/product/:id/timeline - Download trace timeline PDF
router.get('/product/:id/timeline', exportController.exportTraceTimeline);

// GET /export/products/excel - Download products list as Excel
router.get('/products/excel', exportController.exportProductsExcel);

// GET /export/product/:id/qr - Download QR code image
router.get('/product/:id/qr', exportController.getProductQRCode);

// POST /export/qr/batch - Generate batch QR codes as PDF
router.post('/qr/batch', exportController.generateBatchQRCodes);

export default router;
