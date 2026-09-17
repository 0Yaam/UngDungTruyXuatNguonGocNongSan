import { Schema, model, Types } from 'mongoose';

export const ACTION_TYPES = [
  'SEEDING',
  'FERTILIZING',
  'WATERING',
  'PEST_CONTROL',
  'HARVESTING',
  'PACKAGING',
  'SHIPPING',
  'STATUS_UPDATE',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface ITraceEvent {
  product: Types.ObjectId;
  batchId: string;
  eventType: ActionType;
  description: string;
  details?: Record<string, unknown>;
  images: { path: string; filename: string }[];
  videos: { path: string; filename: string; mimeType?: string }[];
  recorded_by: Types.ObjectId;
  dataHash?: string;
  dataHashVersion?: 'v1' | 'v2';
  txHash?: string;
  blockNumber?: number;
  onChainStatus: 'pending' | 'confirmed' | 'failed' | 'skipped';
  actionIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

const traceEventSchema = new Schema<ITraceEvent>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: [true, 'Vui l?ng ch?n lo?i h?nh ??ng'],
      enum: ACTION_TYPES,
    },
    description: {
      type: String,
      required: [true, 'Vui l?ng nh?p m? t?'],
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    images: {
      type: [{ path: String, filename: String }],
      default: [],
    },
    videos: {
      type: [{ path: String, filename: String, mimeType: String }],
      default: [],
    },
    recorded_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dataHash: { type: String },
    dataHashVersion: {
      type: String,
      enum: ['v1', 'v2'],
    },
    txHash: { type: String },
    blockNumber: { type: Number },
    onChainStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'skipped'],
      default: 'pending',
    },
    actionIndex: { type: Number },
  },
  { timestamps: true }
);

traceEventSchema.index({ product: 1, createdAt: 1 });

export default model<ITraceEvent>('TraceEvent', traceEventSchema);
