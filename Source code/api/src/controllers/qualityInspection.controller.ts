import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as service from '../services/qualityInspection.service';

export const getAll = async (req: Request, res: Response) => {
  const inspections = await service.getAll({
    product: req.query.product as string,
    result: req.query.result as string,
    inspection_type: req.query.inspection_type as string,
  });
  res.status(StatusCodes.OK).json({ inspections, count: inspections.length });
};

export const getByProduct = async (req: Request, res: Response) => {
  const inspections = await service.getByProduct(req.params.productId);
  res.status(StatusCodes.OK).json({ inspections, count: inspections.length });
};

export const getMine = async (req: Request, res: Response) => {
  const inspections = await service.getForUser(req.user!.userId, req.user!.role);
  res.status(StatusCodes.OK).json({ inspections, count: inspections.length });
};

export const getById = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ inspection: await service.getById(req.params.id) });
};

export const create = async (req: Request, res: Response) => {
  const inspection = await service.create(req.body, req.user!.userId);
  res.status(StatusCodes.CREATED).json({ inspection });
};

export const update = async (req: Request, res: Response) => {
  const inspection = await service.update(req.params.id, req.body);
  res.status(StatusCodes.OK).json({ inspection });
};

export const remove = async (req: Request, res: Response) => {
  await service.remove(req.params.id);
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa phiếu kiểm nghiệm' });
};
