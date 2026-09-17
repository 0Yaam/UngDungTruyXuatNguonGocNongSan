import { Router } from 'express';
import { upload, uploadMedia } from '../config/upload';
import * as uploadController from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post(
  '/single',
  authenticate,
  upload.single('image'),
  uploadController.uploadSingle
);

router.post(
  '/multiple',
  authenticate,
  upload.array('images', 5),
  uploadController.uploadMultiple
);

router.post(
  '/media',
  authenticate,
  uploadMedia.array('files', 10),
  uploadController.uploadMediaFiles
);

router.delete('/:filename', authenticate, uploadController.deleteImage);

export default router;
