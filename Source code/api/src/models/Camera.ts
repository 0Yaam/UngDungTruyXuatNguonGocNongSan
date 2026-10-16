import { Schema, Types, model } from 'mongoose';

export type CameraSourceType = 'mediamtx' | 'hls' | 'webrtc' | 'mjpeg' | 'phone';
export type CameraStatusOverride = 'auto' | 'online' | 'offline' | 'maintenance';
export type CameraPurpose =
  | 'field_overview'
  | 'greenhouse'
  | 'irrigation'
  | 'nursery'
  | 'storage'
  | 'livestock';

export interface ICamera {
  name: string;
  code: string;
  description?: string;
  source_type: CameraSourceType;
  purpose: CameraPurpose;
  stream_path?: string;
  source_url?: string;
  playback_url: string;
  snapshot_url?: string;
  username?: string;
  password?: string;
  farming_area: Types.ObjectId;
  product?: Types.ObjectId;
  owner: Types.ObjectId;
  is_enabled: boolean;
  status_override: CameraStatusOverride;
  last_seen?: Date;
  last_error?: string;
  ingest_key_hash: string;
  location?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const cameraSchema = new Schema<ICamera>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    source_type: {
      type: String,
      enum: ['mediamtx', 'hls', 'webrtc', 'mjpeg', 'phone'],
      required: true,
      default: 'mediamtx',
    },
    purpose: {
      type: String,
      enum: ['field_overview', 'greenhouse', 'irrigation', 'nursery', 'storage', 'livestock'],
      default: 'field_overview',
    },
    stream_path: { type: String, trim: true, maxlength: 120 },
    source_url: { type: String, trim: true, select: false },
    playback_url: { type: String, required: true, trim: true },
    snapshot_url: { type: String, trim: true },
    username: { type: String, trim: true, select: false },
    password: { type: String, select: false },
    farming_area: { type: Schema.Types.ObjectId, ref: 'FarmingArea', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    is_enabled: { type: Boolean, default: true },
    status_override: {
      type: String,
      enum: ['auto', 'online', 'offline', 'maintenance'],
      default: 'auto',
    },
    last_seen: Date,
    last_error: { type: String, trim: true, maxlength: 500 },
    ingest_key_hash: { type: String, required: true, select: false },
    location: { type: String, trim: true, maxlength: 200 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

cameraSchema.index({ owner: 1, createdAt: -1 });
cameraSchema.index({ farming_area: 1, is_enabled: 1 });

export default model<ICamera>('Camera', cameraSchema);
