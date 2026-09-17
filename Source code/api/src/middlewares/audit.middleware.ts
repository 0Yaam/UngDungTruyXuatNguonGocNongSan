import { Request, Response, NextFunction } from 'express';
import { AuditAction, AuditEntity } from '../models/AuditLog';
import {
  logAction,
  getIpAddress,
  getUserAgent,
} from '../services/auditLog.service';

export interface AuditOptions {
  action: AuditAction;
  entity: AuditEntity;
  getEntityId?: (req: Request, resBody?: unknown) => string | undefined;
  getChanges?: (req: Request, resBody?: unknown) => {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | undefined;
  getMetadata?: (req: Request, resBody?: unknown) => Record<string, unknown> | undefined;
}

/**
 * Middleware that wraps routes to auto-log actions
 * Extracts IP and userAgent from request
 */
export const auditMiddleware = (options: AuditOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      // Only log on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = options.getEntityId
          ? options.getEntityId(req, body)
          : req.params.id;

        const changes = options.getChanges
          ? options.getChanges(req, body)
          : undefined;

        const metadata = options.getMetadata
          ? options.getMetadata(req, body)
          : undefined;

        logAction({
          action: options.action,
          entity: options.entity,
          entityId,
          actorId: req.user.userId,
          actorEmail: req.user.email,
          changes,
          ipAddress: getIpAddress(req),
          userAgent: getUserAgent(req),
          metadata: {
            method: req.method,
            path: req.originalUrl,
            ...metadata,
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

/**
 * Helper to create a simple audit middleware for CREATE actions
 */
export const auditCreate = (
  entity: AuditEntity,
  getEntityId?: (req: Request, resBody?: unknown) => string | undefined
) => {
  return auditMiddleware({
    action: 'CREATE',
    entity,
    getEntityId,
    getChanges: (req, resBody) => ({
      after: req.body,
    }),
  });
};

/**
 * Helper to create a simple audit middleware for UPDATE actions
 */
export const auditUpdate = (entity: AuditEntity) => {
  return auditMiddleware({
    action: 'UPDATE',
    entity,
    getChanges: (req) => ({
      after: req.body,
    }),
  });
};

/**
 * Helper to create a simple audit middleware for DELETE actions
 */
export const auditDelete = (entity: AuditEntity) => {
  return auditMiddleware({
    action: 'DELETE',
    entity,
  });
};
