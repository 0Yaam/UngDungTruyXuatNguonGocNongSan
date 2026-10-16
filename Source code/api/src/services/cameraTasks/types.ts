import { HydratedDocument } from 'mongoose';
import { ICamera } from '../../models/Camera';

export interface StoredCameraFrame {
  absolutePath?: string;
  buffer?: Buffer;
  frameUrl: string;
  filename: string;
}

export interface CameraTaskContext {
  camera: HydratedDocument<ICamera>;
  frame: StoredCameraFrame;
  requestedBy: string;
}

export interface CameraTaskOutput {
  confidence?: number;
  result: Record<string, unknown>;
  alert?: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  };
}

export interface CameraTaskDefinition {
  key: string;
  name: string;
  description: string;
  requires_frame: boolean;
  handler: (context: CameraTaskContext) => Promise<CameraTaskOutput>;
}

export type PublicCameraTaskDefinition = Omit<CameraTaskDefinition, 'handler'>;
