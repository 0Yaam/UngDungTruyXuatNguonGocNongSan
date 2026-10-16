import { spawn } from 'child_process';
import env from '../config/env';
import { ICamera } from '../models/Camera';
import { BadRequestError } from '../utils/errors';

const withCredentials = (value: string, username?: string, password?: string) => {
  if (!username) return value;
  const url = new URL(value);
  url.username = username;
  url.password = password || '';
  return url.toString();
};

export const resolveCameraFrameInputs = (camera: ICamera) => {
  const inputs = [
    camera.source_url ? withCredentials(camera.source_url, camera.username, camera.password) : '',
    camera.stream_path ? `${env.MEDIA_INTERNAL_RTSP_BASE.replace(/\/$/, '')}/${camera.stream_path}` : '',
    camera.playback_url && !camera.playback_url.startsWith('phone://') ? camera.playback_url : '',
  ].filter(Boolean);

  return [...new Set(inputs)];
};

export const resolveCameraFrameInput = (camera: ICamera) => {
  const input = resolveCameraFrameInputs(camera)[0];
  if (!input) {
    throw new BadRequestError(
      'Camera chưa có URL nguồn, stream path hoặc playback URL để lấy frame.',
      'CAMERA_FRAME_SOURCE_REQUIRED'
    );
  }
  return input;
};

const captureInput = (input: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const transportArgs = input.startsWith('rtsp:') || input.startsWith('rtsps:')
      ? ['-rtsp_transport', 'tcp']
      : [];
    const ffmpeg = spawn(env.FFMPEG_PATH, [
      '-hide_banner',
      '-loglevel', 'error',
      ...transportArgs,
      '-i', input,
      '-frames:v', '1',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      'pipe:1',
    ]);
    const chunks: Buffer[] = [];
    let size = 0;
    let stderr = '';
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      ffmpeg.kill('SIGKILL');
      finish(() => reject(new BadRequestError('Hết thời gian chờ lấy frame từ camera.', 'CAMERA_FRAME_TIMEOUT')));
    }, env.CAMERA_FRAME_TIMEOUT_MS);

    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > env.CAMERA_MAX_FRAME_BYTES) {
        ffmpeg.kill('SIGKILL');
        return;
      }
      chunks.push(chunk);
    });
    ffmpeg.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    ffmpeg.on('error', (error) => {
      finish(() => reject(new BadRequestError(`Không chạy được FFmpeg: ${error.message}`, 'FFMPEG_UNAVAILABLE')));
    });
    ffmpeg.on('close', (code) => {
      finish(() => {
        if (size > env.CAMERA_MAX_FRAME_BYTES) {
          reject(new BadRequestError('Frame camera vượt quá giới hạn dung lượng.', 'CAMERA_FRAME_TOO_LARGE'));
          return;
        }
        const frame = Buffer.concat(chunks);
        if (code !== 0 || !frame.length) {
          const detail = stderr.trim().slice(0, 240);
          reject(new BadRequestError(
            `Không thể lấy frame từ camera${detail ? `: ${detail}` : '.'}`,
            'CAMERA_FRAME_CAPTURE_FAILED'
          ));
          return;
        }
        resolve(frame);
      });
    });
  });

export const captureFrameWithFfmpeg = async (camera: ICamera): Promise<Buffer> => {
  const inputs = resolveCameraFrameInputs(camera);
  if (!inputs.length) return captureInput(resolveCameraFrameInput(camera));

  let lastError: unknown;
  for (const input of inputs) {
    try {
      return await captureInput(input);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};
