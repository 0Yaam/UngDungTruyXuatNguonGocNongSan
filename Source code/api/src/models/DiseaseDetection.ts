import { Schema, model, Types } from 'mongoose';

export type DiseaseRiskLevel = 'low' | 'medium' | 'high';

export interface IDiseaseCandidate {
  disease_code: string;
  disease_name: string;
  confidence: number;
  risk_level: DiseaseRiskLevel;
  description: string;
  recommendations: string[];
  crop_code?: string;
  model_label?: string;
  source_label?: string;
  is_healthy?: boolean;
}

export type DiseaseAnalysisStatus = 'completed' | 'inconclusive' | 'legacy';
export type DiseaseInferenceEngine = 'onnx' | 'rules';

export interface IDiseaseDetection {
  product: Types.ObjectId;
  crop_name?: string;
  symptoms: string[];
  notes?: string;
  images: { path: string; filename: string }[];
  candidates: IDiseaseCandidate[];
  top_disease: IDiseaseCandidate;
  overall_risk: DiseaseRiskLevel;
  model_version: string;
  analysis_status: DiseaseAnalysisStatus;
  inference_engine: DiseaseInferenceEngine;
  warnings: string[];
  detected_by: Types.ObjectId;
}

const diseaseCandidateSchema = new Schema<IDiseaseCandidate>(
  {
    disease_code: { type: String, required: true, trim: true },
    disease_name: { type: String, required: true, trim: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    recommendations: { type: [String], default: [] },
    crop_code: { type: String, trim: true },
    model_label: { type: String, trim: true },
    source_label: { type: String, trim: true },
    is_healthy: { type: Boolean, default: false },
  },
  { _id: false }
);

const diseaseDetectionSchema = new Schema<IDiseaseDetection>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    crop_name: {
      type: String,
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    images: {
      type: [{ path: String, filename: String }],
      default: [],
    },
    candidates: {
      type: [diseaseCandidateSchema],
      default: [],
    },
    top_disease: {
      type: diseaseCandidateSchema,
      required: true,
    },
    overall_risk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    model_version: {
      type: String,
      default: 'ruleset-v1',
    },
    analysis_status: {
      type: String,
      enum: ['completed', 'inconclusive', 'legacy'],
      default: 'legacy',
      required: true,
    },
    inference_engine: {
      type: String,
      enum: ['onnx', 'rules'],
      default: 'rules',
      required: true,
    },
    warnings: {
      type: [String],
      default: [],
    },
    detected_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

diseaseDetectionSchema.index({ product: 1, createdAt: -1 });
diseaseDetectionSchema.index({ overall_risk: 1, createdAt: -1 });

export default model<IDiseaseDetection>(
  'DiseaseDetection',
  diseaseDetectionSchema
);
