import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import path from 'path';
import * as service from '../services/diseaseDetection.service';
import { UPLOAD_PATH } from '../config/upload';
import { removeStoredUploads } from '../utils/uploadFiles';

const parseSymptoms = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string') return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Fall through to comma-separated parsing.
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const uploadedImages = (req: Request) => {
  if (!req.files || !Array.isArray(req.files)) return [];
  return req.files.map((file) => ({
    path: `/${UPLOAD_PATH}/${file.filename}`,
    filename: file.filename,
    absolutePath: path.resolve(file.path),
  }));
};

export const getCapabilities = async (req: Request, res: Response) => {
  const result = await service.getCapabilities(
    req.query.product as string | undefined,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json(result);
};

export const getAll = async (req: Request, res: Response) => {
  const detections = await service.getDetections(
    {
      product: req.query.product as string | undefined,
      risk: req.query.risk as any,
    },
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ detections, count: detections.length });
};

export const getByProduct = async (req: Request, res: Response) => {
  const detections = await service.getDetectionsByProduct(
    req.params.productId,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ detections, count: detections.length });
};

export const create = async (req: Request, res: Response) => {
  const images = uploadedImages(req);
  try {
    const detection = await service.createDetection(
      {
        product: req.body.product,
        symptoms: parseSymptoms(req.body.symptoms),
        notes: req.body.notes,
        images,
      },
      req.user!.userId,
      req.user!.role
    );

    res.status(StatusCodes.CREATED).json({
      detection,
      msg:
        detection.analysis_status === 'inconclusive'
          ? 'Kết quả chưa đủ tin cậy; vui lòng kiểm tra cảnh báo'
          : 'Đã phân tích ảnh bệnh cây và lưu kết quả',
    });
  } catch (error) {
    await removeStoredUploads(images);
    throw error;
  }
};

export const remove = async (req: Request, res: Response) => {
  await service.removeDetection(
    req.params.id,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa kết quả nhận diện' });
};
