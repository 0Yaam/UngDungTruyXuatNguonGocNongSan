import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as auditLogService from '../services/auditLog.service';
import { AuditAction, AuditEntity } from '../models/AuditLog';
import { BadRequestError } from '../utils/errors';

export const getLogs = async (req: Request, res: Response) => {
  const {
    action,
    entity,
    entityId,
    actor,
    startDate,
    endDate,
    page = '1',
    limit = '20',
  } = req.query;

  const filters: auditLogService.AuditLogFilters = {
    page: parseInt(page as string, 10) || 1,
    limit: Math.min(parseInt(limit as string, 10) || 20, 100),
  };

  if (action) filters.action = action as AuditAction;
  if (entity) filters.entity = entity as AuditEntity;
  if (entityId) filters.entityId = entityId as string;
  if (actor) filters.actor = actor as string;
  if (startDate) filters.startDate = new Date(startDate as string);
  if (endDate) filters.endDate = new Date(endDate as string);

  const result = await auditLogService.getLogs(filters);
  res.status(StatusCodes.OK).json(result);
};

export const getLogsByEntity = async (req: Request, res: Response) => {
  const { entity, entityId } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const validEntities: AuditEntity[] = ['Product', 'TraceEvent', 'User', 'FarmingArea'];
  if (!validEntities.includes(entity as AuditEntity)) {
    throw new BadRequestError(`Invalid entity: ${entity}`);
  }

  const result = await auditLogService.getLogsByEntity(
    entity as AuditEntity,
    entityId,
    parseInt(page as string, 10) || 1,
    Math.min(parseInt(limit as string, 10) || 20, 100)
  );

  res.status(StatusCodes.OK).json(result);
};

export const getLogsByUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const result = await auditLogService.getLogsByActor(
    userId,
    parseInt(page as string, 10) || 1,
    Math.min(parseInt(limit as string, 10) || 20, 100)
  );

  res.status(StatusCodes.OK).json(result);
};
