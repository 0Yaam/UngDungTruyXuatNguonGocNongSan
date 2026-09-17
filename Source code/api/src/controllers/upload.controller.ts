import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import fs from 'fs';
import path from 'path';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { UPLOAD_PATH } from '../config/upload';

interface ImageResponse {
  path: string;
  filename: string;
}

interface MediaResponse extends ImageResponse {
  mimeType: string;
  mediaType: 'image' | 'video';
}

export const uploadSingle = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError('Vui lòng chọn file ảnh để tải lên');
  }

  const imageResponse: ImageResponse = {
    path: `/${UPLOAD_PATH}/${req.file.filename}`,
    filename: req.file.filename,
  };

  res.status(StatusCodes.CREATED).json(imageResponse);
};

export const uploadMultiple = async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new BadRequestError('Vui lòng chọn ít nhất một file ảnh để tải lên');
  }

  const images: ImageResponse[] = req.files.map((file) => ({
    path: `/${UPLOAD_PATH}/${file.filename}`,
    filename: file.filename,
  }));

  res.status(StatusCodes.CREATED).json(images);
};

export const uploadMediaFiles = async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new BadRequestError('Vui lòng chọn ít nhất một file ảnh hoặc video để tải lên');
  }

  const files: MediaResponse[] = req.files.map((file) => ({
    path: `/${UPLOAD_PATH}/${file.filename}`,
    filename: file.filename,
    mimeType: file.mimetype,
    mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
  }));

  res.status(StatusCodes.CREATED).json({ files, count: files.length });
};

export const deleteImage = async (req: Request, res: Response) => {
  const { filename } = req.params;

  if (!filename) {
    throw new BadRequestError('Vui lòng cung cấp tên file cần xóa');
  }

  // Prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(UPLOAD_PATH, sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('Không tìm thấy file');
  }

  fs.unlinkSync(filePath);

  res.status(StatusCodes.OK).json({ msg: 'Xóa file thành công' });
};
