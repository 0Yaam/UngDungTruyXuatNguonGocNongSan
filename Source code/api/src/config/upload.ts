import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { RequestHandler } from 'express';
import { BadRequestError } from '../utils/errors';

export const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');
export const UPLOAD_PATH = 'uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const DISEASE_IMAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const ALLOWED_MEDIA_MIMETYPES = [
  ...ALLOWED_MIMETYPES,
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Chỉ chấp nhận file ảnh (jpeg, png, gif, webp)'));
  }
};

const mediaFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MEDIA_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Chỉ chấp nhận ảnh hoặc video (mp4, mov, avi, mkv, webm)'));
  }
};

const diseaseImageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (DISEASE_IMAGE_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP để nhận diện bệnh',
        'UNSUPPORTED_IMAGE_TYPE',
        { acceptedMimeTypes: DISEASE_IMAGE_MIMETYPES }
      )
    );
  }
};

const DISEASE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const diseaseImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${DISEASE_EXTENSIONS[file.mimetype] || '.img'}`);
  },
});

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export const uploadMedia = multer({
  storage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: MAX_MEDIA_FILE_SIZE,
  },
});

const diseaseImageUpload = multer({
  storage: diseaseImageStorage,
  fileFilter: diseaseImageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3,
  },
});

export const uploadDiseaseImages: RequestHandler = (req, res, next) => {
  diseaseImageUpload.array('images', 3)(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }

    let mappedError = error;
    if (error instanceof multer.MulterError) {
      if (
        error.code === 'LIMIT_FILE_COUNT' ||
        error.code === 'LIMIT_UNEXPECTED_FILE'
      ) {
        mappedError = new BadRequestError(
          'Chỉ được tải tối đa 3 ảnh cho mỗi lần nhận diện',
          'TOO_MANY_IMAGES',
          { maxImages: 3 }
        );
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        mappedError = new BadRequestError(
          'Mỗi ảnh nhận diện không được vượt quá 5 MB',
          'IMAGE_TOO_LARGE',
          { maxFileSizeBytes: MAX_FILE_SIZE }
        );
      }
    }

    const files = Array.isArray(req.files) ? req.files : [];
    Promise.all(
      files.map(async (file) => {
        const filename = path.basename(file.filename);
        const filePath = path.resolve(UPLOAD_DIR, filename);
        if (filename !== file.filename || path.dirname(filePath) !== UPLOAD_DIR) {
          return;
        }
        try {
          await fs.unlink(filePath);
        } catch (cleanupError: any) {
          if (cleanupError?.code !== 'ENOENT') {
            console.error(`Failed to clean rejected upload ${filename}:`, cleanupError);
          }
        }
      })
    ).finally(() => next(mappedError));
  });
};

export const MAX_IMAGE_FILE_SIZE = MAX_FILE_SIZE;
