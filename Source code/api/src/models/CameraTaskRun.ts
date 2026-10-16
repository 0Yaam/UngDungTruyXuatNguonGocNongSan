import { Schema, Types, model } from 'mongoose';

export type CameraTaskRunStatus = 'processing' | 'completed' | 'failed';

export interface ICameraTaskRun {
  camera: Types.ObjectId;
  task_key: string;
  status: CameraTaskRunStatus;
  requested_by: Types.ObjectId;
  frame_url?: string;
  confidence?: number;
  result?: Record<string, unknown>;
  error?: string;
  started_at: Date;
  completed_at?: Date;
}

const cameraTaskRunSchema = new Schema<ICameraTaskRun>(
  {
    camera: { type: Schema.Types.ObjectId, ref: 'Camera', required: true, index: true },
    task_key: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
      index: true,
    },
    requested_by: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    frame_url: { type: String, trim: true },
    confidence: { type: Number, min: 0, max: 1 },
    result: { type: Schema.Types.Mixed },
    error: { type: String, trim: true, maxlength: 1000 },
    started_at: { type: Date, required: true, default: Date.now },
    completed_at: Date,
  },
  { timestamps: true }
);

cameraTaskRunSchema.index({ camera: 1, createdAt: -1 });
cameraTaskRunSchema.index({ requested_by: 1, task_key: 1, createdAt: -1 });

export default model<ICameraTaskRun>('CameraTaskRun', cameraTaskRunSchema);
