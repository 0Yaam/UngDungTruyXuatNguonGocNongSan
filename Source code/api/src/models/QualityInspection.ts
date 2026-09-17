import { Schema, model, Types } from 'mongoose';

export const INSPECTION_TYPES = [
  'PESTICIDE_RESIDUE',
  'MICROBIOLOGY',
  'HEAVY_METAL',
  'NUTRITION',
  'GENERAL',
] as const;

export type InspectionType = (typeof INSPECTION_TYPES)[number];
export type InspectionResult = 'pending' | 'passed' | 'failed';

export interface IInspectionMetric {
  name: string;
  value: string;
  unit?: string;
  limit?: string;
  passed?: boolean;
}

export interface IQualityInspection {
  product: Types.ObjectId;
  report_number: string;
  inspection_type: InspectionType;
  laboratory: string;
  sample_date: Date;
  result_date?: Date;
  result: InspectionResult;
  summary?: string;
  metrics: IInspectionMetric[];
  document_url?: string;
  created_by: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const qualityInspectionSchema = new Schema<IQualityInspection>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Vui lòng chọn lô nông sản'],
      index: true,
    },
    report_number: {
      type: String,
      required: [true, 'Vui lòng nhập số phiếu kiểm nghiệm'],
      unique: true,
      trim: true,
      maxlength: 120,
    },
    inspection_type: {
      type: String,
      enum: INSPECTION_TYPES,
      required: [true, 'Vui lòng chọn loại kiểm nghiệm'],
    },
    laboratory: {
      type: String,
      required: [true, 'Vui lòng nhập đơn vị kiểm nghiệm'],
      trim: true,
      maxlength: 200,
    },
    sample_date: {
      type: Date,
      required: [true, 'Vui lòng nhập ngày lấy mẫu'],
    },
    result_date: Date,
    result: {
      type: String,
      enum: ['pending', 'passed', 'failed'],
      default: 'pending',
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    metrics: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          value: { type: String, required: true, trim: true },
          unit: { type: String, trim: true },
          limit: { type: String, trim: true },
          passed: Boolean,
        },
      ],
      default: [],
    },
    document_url: { type: String, trim: true },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

qualityInspectionSchema.index({ product: 1, sample_date: -1 });
qualityInspectionSchema.index({ inspection_type: 1, result: 1 });

export default model<IQualityInspection>(
  'QualityInspection',
  qualityInspectionSchema
);
