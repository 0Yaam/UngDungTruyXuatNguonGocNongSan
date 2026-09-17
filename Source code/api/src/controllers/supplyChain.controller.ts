import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as service from '../services/supplyChain.service';

export const getOrganizations = async (_req: Request, res: Response) => {
  const organizations = await service.getOrganizations();
  res.status(StatusCodes.OK).json({ organizations, count: organizations.length });
};
export const createOrganization = async (req: Request, res: Response) => {
  const organization = await service.createOrganization(req.body, req.user!.userId);
  res.status(StatusCodes.CREATED).json({ organization });
};
export const updateOrganization = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ organization: await service.updateOrganization(req.params.id, req.body) });
};
export const deleteOrganization = async (req: Request, res: Response) => {
  await service.deleteOrganization(req.params.id);
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa tổ chức' });
};
export const getRecords = async (req: Request, res: Response) => {
  const records = await service.getRecords(req.query);
  res.status(StatusCodes.OK).json({ records, count: records.length });
};
export const getRecordsByProduct = async (req: Request, res: Response) => {
  const records = await service.getRecordsByProduct(req.params.productId);
  res.status(StatusCodes.OK).json({ records, count: records.length });
};
export const getProductLineage = async (req: Request, res: Response) => {
  const lineage = await service.getProductLineage(req.params.productId);
  res.status(StatusCodes.OK).json(lineage);
};
export const createRecord = async (req: Request, res: Response) => {
  const record = await service.createRecord(req.body, req.user!.userId, req.user!.role);
  res.status(StatusCodes.CREATED).json({ record });
};
export const updateRecord = async (req: Request, res: Response) => {
  const record = await service.updateRecord(req.params.id, req.body, req.user!.userId, req.user!.role);
  res.status(StatusCodes.OK).json({ record });
};
export const deleteRecord = async (req: Request, res: Response) => {
  await service.deleteRecord(req.params.id);
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa hồ sơ chuỗi cung ứng' });
};
