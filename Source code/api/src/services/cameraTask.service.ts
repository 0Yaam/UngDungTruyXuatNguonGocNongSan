import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import Camera from '../models/Camera';
import CameraTaskRun from '../models/CameraTaskRun';
import env from '../config/env';
import { UPLOAD_DIR, UPLOAD_PATH } from '../config/upload';
import { BadRequestError } from '../utils/errors';
import { captureFrameWithFfmpeg } from './cameraFrame.service';
import { getCamera } from './camera.service';
import { getCameraTask, listRegisteredCameraTasks } from './cameraTasks';
import { createNotification } from './notification.service';
import { getLatestPhoneCameraFrame } from './phoneCameraStream.service';

export const listCameraTasks = () => listRegisteredCameraTasks();

const fetchSnapshot = async (camera: any) => {
  if (camera.source_type === 'phone') {
    const frame = getLatestPhoneCameraFrame(camera.code);
    if (!frame) throw new BadRequestError('Camera điện thoại chưa gửi frame.', 'CAMERA_FRAME_UNAVAILABLE');
    return { buffer: frame, originalname: `${camera.code}.jpg` };
  }
  if (!camera.snapshot_url) {
    return { buffer: await captureFrameWithFfmpeg(camera), originalname: `${camera.code}.jpg` };
  }

  const headers: Record<string, string> = {};
  if (camera.username) {
    headers.authorization = `Basic ${Buffer.from(`${camera.username}:${camera.password || ''}`).toString('base64')}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.CAMERA_FRAME_TIMEOUT_MS);
  try {
    const response = await fetch(camera.snapshot_url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > env.CAMERA_MAX_FRAME_BYTES) throw new Error('Frame vượt quá giới hạn dung lượng');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > env.CAMERA_MAX_FRAME_BYTES) throw new Error('Frame không hợp lệ');
    return { buffer, originalname: `${camera.code}.jpg` };
  } catch (error: any) {
    throw new BadRequestError(`Không thể lấy snapshot: ${error.message}`, 'CAMERA_SNAPSHOT_FAILED');
  } finally {
    clearTimeout(timeout);
  }
};

const persistFrame = async (buffer: Buffer) => {
  const directory = path.join(UPLOAD_DIR, 'camera-tasks');
  await fs.mkdir(directory, { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}.jpg`;
  const absolutePath = path.join(directory, filename);
  await sharp(buffer, { failOn: 'error' }).rotate().jpeg({ quality: 90 }).toFile(absolutePath);
  return { absolutePath, frameUrl: `/${UPLOAD_PATH}/camera-tasks/${filename}`, filename };
};

export const runCameraTask = async (
  cameraId: string,
  taskKey: string,
  userId: string,
  role: string,
  uploadedFile?: Express.Multer.File
) => {
  const task = getCameraTask(taskKey);
  const camera = await getCamera(cameraId, userId, role, true);
  const run = await CameraTaskRun.create({ camera: camera._id, task_key: task.key, status: 'processing', requested_by: userId });

  try {
    const sourceFrame = uploadedFile || await fetchSnapshot(camera);
    const frame = await persistFrame(sourceFrame.buffer);
    const output = await task.handler({
      camera,
      frame: { ...frame, buffer: sourceFrame.buffer },
      requestedBy: userId,
    });
    run.status = 'completed';
    run.frame_url = frame.frameUrl;
    run.confidence = output.confidence;
    run.result = output.result;
    run.completed_at = new Date();
    await run.save();
    await Camera.updateOne({ _id: camera._id }, { $set: { last_seen: new Date(), last_error: '' } });

    if (output.alert) {
      await createNotification({
        recipient: camera.owner.toString(),
        title: output.alert.title,
        message: output.alert.message,
        type: output.alert.type,
        category: 'camera',
        relatedEntity: { type: 'camera', id: camera._id.toString() },
      });
    }
    return run;
  } catch (error: any) {
    run.status = 'failed';
    run.error = error?.message || 'Không thể xử lý nhiệm vụ camera';
    run.completed_at = new Date();
    await run.save();
    await Camera.updateOne({ _id: camera._id }, { $set: { last_error: run.error } });
    throw error;
  }
};

export const previewCameraTask = async (
  cameraId: string,
  taskKey: string,
  userId: string,
  role: string,
  uploadedFile?: Express.Multer.File
) => {
  const camera = await getCamera(cameraId, userId, role);
  const task = getCameraTask(taskKey);
  const sourceFrame = uploadedFile
    ? { buffer: uploadedFile.buffer, originalname: uploadedFile.originalname }
    : await fetchSnapshot(camera);
  const output = await task.handler({
    camera,
    frame: {
      buffer: sourceFrame.buffer,
      frameUrl: '',
      filename: sourceFrame.originalname || `${camera.code}.jpg`,
    },
    requestedBy: userId,
  });
  await Camera.updateOne({ _id: camera._id }, { $set: { last_seen: new Date(), last_error: '' } });
  return { status: 'completed' as const, confidence: output.confidence, result: output.result };
};

export const listCameraTaskRuns = async (cameraId: string, userId: string, role: string, taskKey?: string) => {
  await getCamera(cameraId, userId, role);
  const filter: Record<string, unknown> = { camera: cameraId };
  if (taskKey) filter.task_key = taskKey;
  return CameraTaskRun.find(filter).sort({ createdAt: -1 }).limit(100);
};
