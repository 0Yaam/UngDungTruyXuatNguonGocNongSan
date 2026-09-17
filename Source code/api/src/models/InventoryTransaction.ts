import { Schema, model, Types } from 'mongoose';

export const INVENTORY_TRANSACTION_TYPES = [
  'INITIAL',
  'ADJUST_IN',
  'ADJUST_OUT',
  'SPLIT_OUT',
  'SPLIT_IN',
  'MERGE_OUT',
  'MERGE_IN',
  'RECALL_OUT',
] as const;

export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];

export interface IInventoryTransaction {
  product: Types.ObjectId;
  type: InventoryTransactionType;
  quantity: number;
  unit: string;
  balance_before: number;
  balance_after: number;
  related_products: Types.ObjectId[];
  note?: string;
  occurred_at: Date;
  metadata?: Record<string, unknown>;
  created_by: Types.ObjectId;
}

const schema = new Schema<IInventoryTransaction>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: INVENTORY_TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Số lượng giao dịch không được âm'],
    },
    unit: {
      type: String,
      trim: true,
      default: 'kg',
      maxlength: 30,
    },
    balance_before: {
      type: Number,
      required: true,
      min: 0,
    },
    balance_after: {
      type: Number,
      required: true,
      min: 0,
    },
    related_products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    occurred_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

schema.index({ product: 1, occurred_at: -1 });
schema.index({ product: 1, type: 1 });

export default model<IInventoryTransaction>('InventoryTransaction', schema);
