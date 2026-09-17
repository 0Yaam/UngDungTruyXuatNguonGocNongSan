import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as publicTraceService from '../services/publicTrace.service';

export const getPublicTrace = async (req: Request, res: Response) => {
  const result = await publicTraceService.getPublicTrace(req.params.productId);
  res.status(StatusCodes.OK).json(result);
};
