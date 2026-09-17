import { Request, Response, NextFunction } from 'express';
import AuditLog, { AuditAction, AuditEntity, IAuditLog } from '../models/AuditLog';

export interface AuditLogData {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  actorId: string;
  actorEmail: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  action?: AuditAction;
  entity?: AuditEntity;
  entityId?: string;
  actor?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Create a new audit log entry
 */
export const logAction = async (data: AuditLogData): Promise<IAuditLog> => {
  const auditLog = await AuditLog.create({
    action: data.action,
    entity: data.entity,
    entityId: data.entityId,
    actor: data.actorId,
    actorEmail: data.actorEmail,
    changes: data.changes,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    metadata: data.metadata,
    timestamp: new Date(),
  });

  return auditLog;
};

/**
 * Get audit logs for a specific entity
 */
export const getLogsByEntity = async (
  entity: AuditEntity,
  entityId: string,
  page = 1,
  limit = 20
) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find({ entity, entityId })
      .populate('actor', 'first_name last_name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments({ entity, entityId }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get audit logs by actor (user)
 */
export const getLogsByActor = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find({ actor: userId })
      .populate('actor', 'first_name last_name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments({ actor: userId }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get audit logs with filters and pagination
 */
export const getLogs = async (filters: AuditLogFilters = {}) => {
  const {
    action,
    entity,
    entityId,
    actor,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const query: Record<string, unknown> = {};

  if (action) query.action = action;
  if (entity) query.entity = entity;
  if (entityId) query.entityId = entityId;
  if (actor) query.actor = actor;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) (query.timestamp as Record<string, Date>).$gte = startDate;
    if (endDate) (query.timestamp as Record<string, Date>).$lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actor', 'first_name last_name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Extract IP address from request
 */
export const getIpAddress = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
};

/**
 * Extract user agent from request
 */
export const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Create audit middleware to auto-log actions
 */
export const createAuditMiddleware = (
  action: AuditAction,
  entity: AuditEntity,
  getEntityId?: (req: Request) => string | undefined
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = getEntityId ? getEntityId(req) : req.params.id;

        logAction({
          action,
          entity,
          entityId,
          actorId: req.user.userId,
          actorEmail: req.user.email,
          ipAddress: getIpAddress(req),
          userAgent: getUserAgent(req),
          metadata: {
            method: req.method,
            path: req.originalUrl,
          },
        }).catch((err) => {
          console.error('Failed to create audit log:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
};
