import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as inventoryService from '../services/inventory.service';

export const getInventoryByProduct = async (req: Request, res: Response) => {
  const result = await inventoryService.getInventoryByProduct(
    req.params.id,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json(result);
};

export const adjustInventory = async (req: Request, res: Response) => {
  const result = await inventoryService.adjustInventory(
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.OK).json(result);
};

export const splitProduct = async (req: Request, res: Response) => {
  const result = await inventoryService.splitProduct(
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.CREATED).json(result);
};

export const mergeProducts = async (req: Request, res: Response) => {
  const result = await inventoryService.mergeProducts(
    req.body,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.CREATED).json(result);
};

export const recallProduct = async (req: Request, res: Response) => {
  const result = await inventoryService.recallProduct(
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  res.status(StatusCodes.CREATED).json(result);
};
