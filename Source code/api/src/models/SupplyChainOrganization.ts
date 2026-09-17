import { Schema, model, Types } from 'mongoose';

export const ORGANIZATION_TYPES = [
  'SUPPLIER',
  'COOPERATIVE',
  'PROCESSOR',
  'WAREHOUSE',
  'CARRIER',
  'DISTRIBUTOR',
  'RETAILER',
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export interface ISupplyChainOrganization {
  name: string;
  type: OrganizationType;
  tax_code?: string;
  address: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_by: Types.ObjectId;
}

const schema = new Schema<ISupplyChainOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, enum: ORGANIZATION_TYPES, required: true, index: true },
    tax_code: { type: String, trim: true, unique: true, sparse: true },
    address: { type: String, required: true, trim: true },
    contact_name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

schema.index({ name: 'text', address: 'text' });

export default model<ISupplyChainOrganization>('SupplyChainOrganization', schema);
