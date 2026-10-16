import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/camera.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { DISEASE_IMAGE_MIMETYPES, MAX_IMAGE_FILE_SIZE } from '../config/upload';
import { BadRequestError } from '../utils/errors';

const router = Router();
const frameUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (DISEASE_IMAGE_MIMETYPES.includes(file.mimetype)) callback(null, true);
    else callback(new BadRequestError('Frame phải là ảnh JPEG, PNG hoặc WebP'));
  },
});

router.post('/agent/:code/heartbeat', controller.heartbeat);
router.use(authenticate);
router.use(authorize('admin', 'manager', 'farmer'));
router.get('/tasks', controller.getTasks);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/rotate-key', controller.rotateKey);
router.get('/:id/task-runs', controller.getTaskRuns);
router.post('/:id/tasks/:taskKey/preview', frameUpload.single('image'), controller.previewTask);
router.post('/:id/tasks/:taskKey/run', frameUpload.single('image'), controller.runTask);

export default router;
