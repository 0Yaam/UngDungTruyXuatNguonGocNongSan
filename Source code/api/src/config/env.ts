import { config } from 'dotenv';
config();

const env = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_URI: process.env.DB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_LIFETIME: process.env.JWT_LIFETIME || '1d',
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  LIVE_DISEASE_PATH:
    process.env.LIVE_DISEASE_PATH || '/api/v1/disease-detections/live',
  LIVE_DISEASE_MAX_CONNECTIONS: Number(
    process.env.LIVE_DISEASE_MAX_CONNECTIONS || 16
  ),
  LIVE_DISEASE_MAX_FRAME_BYTES: Number(
    process.env.LIVE_DISEASE_MAX_FRAME_BYTES || 5 * 1024 * 1024
  ),
  LIVE_DISEASE_SMOOTHING_WINDOW: Number(
    process.env.LIVE_DISEASE_SMOOTHING_WINDOW || 5
  ),
  LIVE_DISEASE_EVENT_COOLDOWN_MS: Number(
    process.env.LIVE_DISEASE_EVENT_COOLDOWN_MS || 300_000
  ),
  CAMERA_OFFLINE_AFTER_MS: Number(process.env.CAMERA_OFFLINE_AFTER_MS || 90_000),
  CAMERA_FRAME_TIMEOUT_MS: Number(process.env.CAMERA_FRAME_TIMEOUT_MS || 15_000),
  CAMERA_MAX_FRAME_BYTES: Number(process.env.CAMERA_MAX_FRAME_BYTES || 5 * 1024 * 1024),
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',
  MEDIA_INTERNAL_RTSP_BASE:
    process.env.MEDIA_INTERNAL_RTSP_BASE || 'rtsp://mediamtx:8554',
  MEDIA_CONTROL_API_BASE:
    process.env.MEDIA_CONTROL_API_BASE || 'http://mediamtx:9997',
  MEDIA_PUBLIC_WEBRTC_BASE:
    process.env.MEDIA_PUBLIC_WEBRTC_BASE || 'http://localhost:8889',
  MEDIA_PUBLIC_HLS_BASE:
    process.env.MEDIA_PUBLIC_HLS_BASE || 'http://localhost:8888',
};

export default env;
