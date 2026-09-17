import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as traceService from '../services/traceEvent.service';

export const createTraceEvent = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { product, eventType, description, details, images, videos } = req.body;
  const result = await traceService.createTraceEvent(
    { product, eventType, description, details, images, videos },
    userId,
    req.user!.role
  );

  const event = result.traceEvent;

  res.status(StatusCodes.CREATED).json({
    msg: result.warning || 'T?o s? ki?n th?nh c?ng',
    warning: result.warning || null,
    event,
    traceEvent: event,
    blockchain: result.blockchain,
    txHash: result.blockchain?.txHash || event.txHash || '',
    dataHash: result.blockchain?.dataHash || event.dataHash || '',
    onChainStatus: event.onChainStatus,
  });
};

export const getEventsByProduct = async (req: Request, res: Response) => {
  const events = await traceService.getEventsByProduct(req.params.productId);
  res.status(StatusCodes.OK).json({ events, count: events.length });
};

export const getFullTrace = async (req: Request, res: Response) => {
  const result = await traceService.getFullTrace(req.params.productId);
  res.status(StatusCodes.OK).json(result);
};

export const verifyTraceEvent = async (req: Request, res: Response) => {
  const result = await traceService.verifyTraceEvent(req.params.eventId);
  res.status(StatusCodes.OK).json(result);
};

export const retryTraceEvent = async (req: Request, res: Response) => {
  const event = await traceService.retryTraceEvent(
    req.params.eventId,
    req.user!.userId,
    req.user!.role
  );

  res.status(StatusCodes.OK).json({
    msg: 'Đã ghi lại sự kiện lên blockchain thành công',
    event,
    traceEvent: event,
    txHash: event.txHash || '',
    dataHash: event.dataHash || '',
    onChainStatus: event.onChainStatus,
  });
};
