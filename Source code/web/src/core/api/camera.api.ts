import axiosClient from './axiosClient';

export type CameraStatus = 'online' | 'offline' | 'maintenance';
export type CameraSourceType = 'mediamtx' | 'hls' | 'webrtc' | 'mjpeg' | 'phone';
export type CameraPurpose = 'field_overview' | 'greenhouse' | 'irrigation' | 'nursery' | 'storage' | 'livestock';

export interface Camera {
  _id: string;
  name: string;
  code: string;
  description?: string;
  source_type: CameraSourceType;
  purpose: CameraPurpose;
  stream_path?: string;
  playback_url: string;
  stream_urls?: { webrtc?: string; hls?: string };
  snapshot_url?: string;
  farming_area?: { _id: string; name: string; address?: string };
  product?: { _id: string; name: string; category?: string };
  is_enabled: boolean;
  status_override: 'auto' | CameraStatus;
  status: CameraStatus;
  last_seen?: string;
  last_error?: string;
  location?: string;
}

export interface CameraTask {
  key: string;
  name: string;
  description: string;
  requires_frame: boolean;
}

export interface CameraTaskRun {
  _id: string;
  task_key: string;
  status: 'processing' | 'completed' | 'failed';
  frame_url?: string;
  confidence?: number;
  result?: {
    top_disease?: {
      disease_name: string;
      confidence: number;
      risk_level: 'low' | 'medium' | 'high';
      description: string;
      recommendations: string[];
      is_healthy?: boolean;
    };
    candidates?: Array<{ disease_name: string; confidence: number }>;
    detections?: Array<{
      disease_name: string;
      confidence: number;
      risk_level: 'low' | 'medium' | 'high';
      is_healthy?: boolean;
      box: { x: number; y: number; width: number; height: number };
    }>;
    detection_mode?: 'object-detection' | 'classification';
    source_width?: number;
    source_height?: number;
    inference_engine?: string;
    model_version?: string;
    warnings?: string[];
    [key: string]: unknown;
  };
  error?: string;
  createdAt: string;
}

export type CameraPayload = Omit<Partial<Camera>, 'farming_area' | 'product'> & {
  name: string;
  source_url?: string;
  username?: string;
  password?: string;
  farming_area?: string;
  product?: string;
};

export const cameraApi = {
  list: () => axiosClient.get<{ cameras: Camera[] }>('/cameras'),
  tasks: () => axiosClient.get<{ tasks: CameraTask[] }>('/cameras/tasks'),
  create: (payload: CameraPayload) => axiosClient.post<{ camera: Camera; ingest_key: string }>('/cameras', payload),
  update: (id: string, payload: CameraPayload) => axiosClient.patch<{ camera: Camera }>(`/cameras/${id}`, payload),
  remove: (id: string) => axiosClient.delete(`/cameras/${id}`),
  rotateKey: (id: string) => axiosClient.post<{ camera: Camera; ingest_key: string }>(`/cameras/${id}/rotate-key`),
  runs: (id: string, task?: string) => axiosClient.get<{ runs: CameraTaskRun[] }>(`/cameras/${id}/task-runs`, { params: { task } }),
  run: (id: string, task: string, image?: File) => {
    const body = new FormData();
    if (image) body.append('image', image);
    return axiosClient.post<{ run: CameraTaskRun }>(`/cameras/${id}/tasks/${task}/run`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  preview: (id: string, task: string) =>
    axiosClient.post<{
      analysis: Pick<CameraTaskRun, 'status' | 'confidence' | 'result'>;
    }>(`/cameras/${id}/tasks/${task}/preview`),
};
