import { Schema, model, Document, Types } from 'mongoose';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RETRY'
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER';
export type AuditEntity =
  | 'Product'
  | 'TraceEvent'
  | 'User'
  | 'FarmingArea'
  | 'QualityInspection'
  | 'DiseaseDetection'
  | 'SupplyChainOrganization'
  | 'SupplyChainRecord'
  | 'InventoryTransaction';

export interface IAuditLog extends Document {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  actor: Types.ObjectId;
  actorEmail: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: ['CREATE', 'UPDATE', 'DELETE', 'RETRY', 'LOGIN', 'LOGOUT', 'REGISTER'],
    },
    entity: {
      type: String,
      required: [true, 'Entity is required'],
      enum: ['Product', 'TraceEvent', 'User', 'FarmingArea', 'QualityInspection', 'DiseaseDetection', 'SupplyChainOrganization', 'SupplyChainRecord', 'InventoryTransaction'],
    },
    entityId: {
      type: String,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor is required'],
    },
    actorEmail: {
      type: String,
      required: [true, 'Actor email is required'],
    },
    changes: {
      before: {
        type: Schema.Types.Mixed,
      },
      after: {
        type: Schema.Types.Mixed,
      },
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ entity: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export default model<IAuditLog>('AuditLog', auditLogSchema);
