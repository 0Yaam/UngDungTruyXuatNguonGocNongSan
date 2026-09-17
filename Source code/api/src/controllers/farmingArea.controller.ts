import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as farmingAreaService from '../services/farmingArea.service';

export const getAllFarmingAreas = async (_req: Request, res: Response) => {
  const farmingAreas = await farmingAreaService.getAllFarmingAreas();
  res.status(StatusCodes.OK).json({ farmingAreas, count: farmingAreas.length });
};

export const getFarmingArea = async (req: Request, res: Response) => {
  const farmingArea = await farmingAreaService.getFarmingAreaById(req.params.id);
  res.status(StatusCodes.OK).json({ farmingArea });
};

export const getMyFarmingAreas = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const farmingAreas = await farmingAreaService.getFarmingAreasByOwner(userId);
  res.status(StatusCodes.OK).json({ farmingAreas, count: farmingAreas.length });
};

export const createFarmingArea = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const farmingArea = await farmingAreaService.createFarmingArea(req.body, userId);
  res.status(StatusCodes.CREATED).json({ farmingArea });
};

export const updateFarmingArea = async (req: Request, res: Response) => {
  const farmingArea = await farmingAreaService.updateFarmingArea(
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json({ farmingArea });
};

export const deleteFarmingArea = async (req: Request, res: Response) => {
  await farmingAreaService.deleteFarmingArea(req.params.id);
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa vùng canh tác' });
};
