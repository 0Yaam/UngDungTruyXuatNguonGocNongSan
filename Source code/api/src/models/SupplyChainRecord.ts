import { Schema, model, Types } from 'mongoose';

export const SUPPLY_CHAIN_OPERATIONS = [
  'TRANSFER',
  'SPLIT',
  'MERGE',
  'PROCESSING',
  'WAREHOUSE_IN',
  'WAREHOUSE_OUT',
  'TRANSPORT',
  'RECALL',
] as const;

export type SupplyChainOperation = (typeof SUPPLY_CHAIN_OPERATIONS)[number];
export type SupplyChainStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ISupplyChainRecord {
  product: Types.ObjectId;
  related_products: Types.ObjectId[];
  operation_type: SupplyChainOperation;
  title: string;
  description?: string;
  from_organization?: Types.ObjectId;
  to_organization?: Types.ObjectId;
  status: SupplyChainStatus;
  quantity?: number;
  unit?: string;
  occurred_at: Date;
  location?: string;
  temperature?: number;
  humidity?: number;
  vehicle?: string;
  driver?: string;
  recall_reason?: string;
  metadata?: Record<string, unknown>;
  created_by: Types.ObjectId;
}

const schema = new Schema<ISupplyChainRecord>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    related_products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    operation_type: { type: String, enum: SUPPLY_CHAIN_OPERATIONS, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 3000 },
    from_organization: { type: Schema.Types.ObjectId, ref: 'SupplyChainOrganization' },
    to_organization: { type: Schema.Types.ObjectId, ref: 'SupplyChainOrganization' },
    status: {
      type: String,
      enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNED',
      index: true,
    },
    quantity: { type: Number, min: 0 },
    unit: { type: String, trim: true, default: 'kg' },
    occurred_at: { type: Date, required: true, default: Date.now, index: true },
    location: { type: String, trim: true },
    temperature: Number,
    humidity: { type: Number, min: 0, max: 100 },
    vehicle: { type: String, trim: true },
    driver: { type: String, trim: true },
    recall_reason: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

schema.index({ product: 1, occurred_at: -1 });
schema.index({ related_products: 1, occurred_at: -1 });

export default model<ISupplyChainRecord>('SupplyChainRecord', schema);
