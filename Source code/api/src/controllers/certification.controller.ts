import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as certificationService from '../services/certification.service';

export const getAllCertifications = async (_req: Request, res: Response) => {
  const certifications = await certificationService.getAllCertifications();
  res
    .status(StatusCodes.OK)
    .json({ certifications, count: certifications.length });
};

export const getCertification = async (req: Request, res: Response) => {
  const certification = await certificationService.getCertificationById(
    req.params.id
  );
  res.status(StatusCodes.OK).json({ certification });
};

export const getCertificationsByHolder = async (
  req: Request,
  res: Response
) => {
  const certifications = await certificationService.getCertificationsByHolder(
    req.params.userId
  );
  res
    .status(StatusCodes.OK)
    .json({ certifications, count: certifications.length });
};

export const getCertificationsByFarmingArea = async (
  req: Request,
  res: Response
) => {
  const certifications =
    await certificationService.getCertificationsByFarmingArea(req.params.areaId);
  res
    .status(StatusCodes.OK)
    .json({ certifications, count: certifications.length });
};

export const createCertification = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const certification = await certificationService.createCertification(
    req.body,
    userId
  );
  res.status(StatusCodes.CREATED).json({ certification });
};

export const updateCertification = async (req: Request, res: Response) => {
  const certification = await certificationService.updateCertification(
    req.params.id,
    req.body
  );
  res.status(StatusCodes.OK).json({ certification });
};

export const deleteCertification = async (req: Request, res: Response) => {
  await certificationService.deleteCertification(req.params.id);
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa chứng nhận' });
};

export const checkExpiredCertifications = async (
  _req: Request,
  res: Response
) => {
  const result = await certificationService.checkExpiredCertifications();
  res.status(StatusCodes.OK).json(result);
};
